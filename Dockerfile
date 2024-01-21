<<<<<<< HEAD
# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json into the image
COPY package*.json ./

# Install the project's dependencies
RUN npm install

# Copy the rest of the project files into the image
COPY . .

# Run the watch command to rebuild the extension whenever a file changes
=======
# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json into the image
COPY package*.json ./

# Install the project's dependencies
RUN npm install

# Copy the rest of the project files into the image
COPY . .

# Run the watch command to rebuild the extension whenever a file changes
>>>>>>> 733b55cb883b96dbc554a956e395f40a2348caae
CMD [ "npm", "run", "watch" ]