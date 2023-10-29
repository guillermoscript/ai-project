from langchain.document_loaders import PyPDFLoader
import fitz # imports the pymupdf library
import tiktoken


def send_text():
    return 'YES'

def get_pdf_content(file_path):
    doc = fitz.open(file_path) # open a document
    text_content = ''
    for page in doc: # iterate the document pages
        text_content += page.get_text() # get plain text encoded as UTF-8
    print(text_content)
    return text_content

max_tokens = 1000
# Function to split the text into chunks of a maximum number of tokens
def split_into_many(text, max_tokens = max_tokens):

    # Load the cl100k_base tokenizer which is designed to work with the ada-002 model
    tokenizer = tiktoken.get_encoding("cl100k_base")
    # Split the text into sentences
    sentences = text.split('. ')
    print("Number of sentences: " + str(len(sentences)))
    # Get the number of tokens for each sentence
    n_tokens = [len(tokenizer.encode(" " + sentence)) for sentence in sentences]

    chunks = []
    tokens_so_far = 0
    chunk = []
    # Loop through the sentences and tokens joined together in a tuple
    for sentence, token in zip(sentences, n_tokens):
        # If the number of tokens so far plus the number of tokens in the current sentence is greater
        # than the max number of tokens, then add the chunk to the list of chunks and reset
        # the chunk and tokens so far
        if tokens_so_far + token > max_tokens:
            chunks.append(". ".join(chunk) + ".")
            chunk = []
            tokens_so_far = 0
        # If the number of tokens in the current sentence is greater than the max number of
        # tokens, go to the next sentence
        if token > max_tokens:
            continue
        # Otherwise, add the sentence to the chunk and add the number of tokens to the total
        chunk.append(sentence)
        tokens_so_far += token + 1

    print("Number of chunks: " + str(len(chunks)))
    return chunks

