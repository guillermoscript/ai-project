import os
import openai
import mimetypes
from flask import Flask, request, Response
from dotenv import load_dotenv
from pydub import AudioSegment
import logging
from flask import jsonify
from pdf import send_text, get_pdf_content, split_into_many
from supabase.client import Client, create_client
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import SupabaseVectorStore
from langchain.schema import Document
import uuid
from datetime import datetime
import os, tempfile, uuid

load_dotenv()
openai.api_key = os.getenv('OPEN_AI_KEY')

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)


app = Flask(__name__)


logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s: %(message)s')

@app.route('/')
def hello_world():
    return 'Hello, world!'

@app.route('/pdf')
def pdf():
    return send_text()

@app.route('/process-pdf', methods=['POST']) 
def process_pdf():
    try:
        # Get the uploaded file
        file = request.files['pdf'] 
        id_of_file = request.form['document_id']
        id_of_chat = request.form['chat_id']

        logging.info('Processing PDF file: ' + file.filename)

        # Get file extension 
        _, file_ext = os.path.splitext(file.filename)
        # Generate a random UUID
        unique_filename = str(uuid.uuid4())
        # secure_filename ensures the filename is safe to use (removes unsupported chars)
        file.filename = (unique_filename + file_ext)
        # file.filename = secure_filename(file.filename)
        
        # Create a temporary file with a safe unique name
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            # Save the uploaded file to this temporary file
            tmp.write(file.read())
            
            # Re-read the saved temporary file
            text_content = get_pdf_content(tmp.name)
            embeddings = create_embeddings(text_content, id_of_file, id_of_chat)
        # Delete the temporary file now that we're done with it
        os.unlink(tmp.name)

        return "Success!", 200
    except Exception as e:
        error_message = 'Error occurred: ' + str(e)
        logging.error(error_message)
        response = jsonify({'error': str(e)})
        response.status_code = 400  # Set the status code to indicate a client error
        return response

@app.route('/ask-question', methods=['POST']) # Use a POST method to send question
def ask_question():
    inp = request.json
    question = inp.get('question')
    message = [{'role': 'system', 'content': 'You are a helpful assistant.'}, {'role': 'user', 'content': question}]
    response = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=message)
    return response['choices'][0]['message']['content'], 200 # Returns the answer to the question received.

@app.route('/split-audio', methods=['POST'])
def split_audio():
    try:
        audio_file = request.files['audio']
        file_extension = mimetypes.guess_extension(audio_file.content_type)[1:]
        file_format = mimetypes.guess_extension(file_extension)

        audio = AudioSegment.from_file(audio_file, format=file_format)

        segment_length = 10 * 60  # Start with 10 minutes
        max_segment_size = 24 * 1024 * 1024  # 24MB in bytes
        prompt = ""
        full_text = ""

        segment_filename = os.path.splitext(audio_file.filename)[0]
        duration = audio.duration_seconds
        number_of_segments = int(duration / segment_length)

        logging.info('Splitting audio into segments')

        if number_of_segments == 0:
            number_of_segments = 1

        # Split the audio into segments and transcribe each segment
        i = 0
        segment_start = 0
        segment_end = segment_length * 1000

        while segment_start < duration * 1000:
            logging.info('Segment ' + str(i+1) + ' processing')

            sound_export = audio[segment_start:segment_end]
            export_format = file_extension
            exported_file = '/tmp/' + segment_filename + '-' + str(i+1) + '.' + export_format
            sound_export.export(exported_file, format=export_format)

            # Check the size of the exported file
            while os.path.getsize(exported_file) > max_segment_size:
                # If the file is larger than 24MB, split it into smaller segments
                segment_length /= 2  # Halve the segment length
                segment_end = segment_start + segment_length * 1000
                sound_export = audio[segment_start:segment_end]
                sound_export.export(exported_file, format=export_format)

            logging.info('Segment ' + str(i+1) + ' exported')

            with open(exported_file, "rb") as f:
                data = openai.Audio.transcribe("whisper-1", f, prompt=prompt)

            logging.info('Segment ' + str(i+1) + ' transcribing')

            prompt += data.text
            full_text += data.text

            logging.info('Segment ' + str(i+1) + ' transcribed')

            # Update segment_start and segment_end for the next loop iteration
            segment_start = segment_end
            segment_end += segment_length * 1000
            i += 1

        logging.info('Audio transcribed')

        return jsonify({'full_text': full_text}), 200

    except Exception as e:
        error_message = 'Error occurred: ' + str(e)
        logging.error(error_message)
        response = jsonify({'error': str(e)})
        response.status_code = 400  # Set the status code to indicate a client error
        return response

def create_embeddings(input_text, id_of_file, id_of_chat):
    # The OpenAI API can only process 'max_tokens' tokens at a time.
    # So, we divide the text into chunks that have less than 'max_tokens' tokens.
    chunks = split_into_many(input_text)

    embeddings = []
    for chunk in chunks:
        # Generate embedding for each chunk and append to 'embeddings' list
        embedding = openai.Embedding.create(input=chunk, engine='text-embedding-ada-002')['data'][0]['embedding']
        # embeddings.append(embedding)
        data, count = supabase.table('documents').insert([{"content": chunk, "embedding": embedding, "metadata": {"document_id": id_of_file, "chat_id": id_of_chat}}]).execute()

    logging.info('Embeddings created')
    return embeddings

if __name__ == '__main__':
    # Set the maximum content size limit to 150MB
    app.config['MAX_CONTENT_LENGTH'] = 150 * 1024 * 1024
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=True)