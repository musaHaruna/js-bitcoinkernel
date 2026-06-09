FROM ubuntu:24.04

# Prevent interactive prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

# Install essential compilation tools and core Bitcoin build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkgconf \
    python3 \
    libevent-dev \
    libboost-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /workspace