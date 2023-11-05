# Use the official Python image as the base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# show current directory structure
RUN echo "Current directory structure is:" && ls -la


RUN echo '${PWD}'


# Copy the requirements file to the container
COPY app/requirements.txt .

# Install the Python dependencies
RUN apt-get update && apt-get install -y ffmpeg && pip install --no-cache-dir -r requirements.txt

# Copy the Flask application code to the container
COPY . .

# Expose the port on which the Flask application will run
EXPOSE 5040

# Set the environment variable for the OpenAI API key
ENV OPEN_AI_KEY=${OPEN_AI_KEY}
# Set the environment variable for the Supabase API key
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV SUPABASE_URL=${SUPABASE_URL}


# Run the Flask application
CMD ["python", "app.py"]