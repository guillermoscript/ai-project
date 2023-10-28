# Use the official Python image as the base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY requirements.txt .

# Install the Python dependencies
RUN apt-get update && apt-get install -y ffmpeg && pip install --no-cache-dir -r requirements.txt

# Copy the Flask application code to the container
COPY . .

# Expose the port on which the Flask application will run
EXPOSE 5040

# Set the environment variable for the OpenAI API key
ENV OPENAI_API_KEY=${OPEN_AI_KEY}

# Run the Flask application
CMD ["python", "app.py"]