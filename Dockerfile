# Use an official Node.js image as the base for Node and Webpack
FROM node:16 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app files
COPY . .

# Build the app using Webpack (you can switch to production as needed)
RUN npm run build 
# or npm run build:prod for production

# Use an official Python image for running Python scripts
FROM python:3.9-slim AS python_base

# Install necessary Python packages
RUN pip install --no-cache-dir flask numpy pandas
# Add other packages as needed

# Use a lightweight image for serving the app
FROM node:16-alpine

# Set the working directory
WORKDIR /app

# Copy files from the build stage
COPY --from=build . .

# Copy any Python scripts needed
# COPY --from=python_base /app/python-scripts /app/python-scripts

# Install http-server for serving the app
RUN npm install -g http-server

# Expose the port that http-server will use
EXPOSE 1338

# Command to run the app using http-server
CMD ["http-server", "-p", "1338", "-c-1", "-d"]