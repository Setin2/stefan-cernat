terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 2.0"  # Specify the version you need
    }
  }
}

provider "docker" {
  # Configuration options for the Docker provider
}


# Build the Docker image for the app
resource "docker_image" "babylonjs_app" {
  name         = "babylonjs_app"
  build {
    context    = "../.."  # Points to the root 'stefan-cernat' directory
    dockerfile = "../../Dockerfile"  # Points to the Dockerfile in 'stefan-cernat'
  }
}

# Run a Docker container for the app
resource "docker_container" "babylonjs_app_container" {
  image = docker_image.babylonjs_app.image_id
  name  = "babylonjs_app_dev"

  # Map port 1338 on the host to port 1338 in the container
  ports {
    internal = 1338
    external = 1338
  }

  # Optional: Mount a local directory to the container for live-reloading
  volumes {
    host_path      = abspath("../../dist")
    container_path = "/app/dist"
  }
}

# Optional: Define more containers or services as needed
