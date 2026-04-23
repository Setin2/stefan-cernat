# About

This is an interactive personal website built with Babylon.js and inspired by Bruno Simon.
The website is still under development and is available at https://setin2.github.io/stefan-cernat/

# Running locally & on the cloud (IaC)

## Running locally

The application is still being developed and has only a few features so far, so the setup is simple.

1. First clone the repository and install all dependencies using `npm install`.
2. (Optional) If you want webpack to rebuild while you edit, run `npm run watch`.
3. You can start the application using `npm run webserver`, which will use `http-server` to host it on `http://localhost:1338/app/`.

## Running locally using Terraform & Docker (dev)

As the application grows and is potentially hosted in the cloud, it will naturally gain more dependencies. You can build the application using Docker through Terraform, which will take care of the whole process.

Doing this locally is not entirely necessary, since most of it can be done directly through Docker. It can still be useful for testing and working with IaC. These are the steps:

1. Make sure you have Docker installed and running through `sudo systemctl start docker` on Linux.
2. Make sure you have Terraform installed. If not, follow the HashiCorp documentation.
3. Navigate to `terraform/dev/` and run `terraform init` to initialize the Terraform working directory and set up the required files.
4. (Optional) Run `terraform plan` to see a plan of the desired state of the infrastructure.
5. Run `terraform apply`. After that, you can access the application on `http://localhost:1338/app/`.
6. (Optional) If you make any changes to the code, you can run `terraform apply`, and the changes will be reflected in the application.
7. When you are done, run `terraform destroy` to stop and remove the Docker image.

## Running on the cloud (prod)

This is not implemented yet. The folder `terraform/prod/` will contain the necessary configuration.
