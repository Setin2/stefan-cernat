# About

This is an interactive personal website, made in babylon.js, and inspired by Bruno Simon. 
The website is still under developement and available at https://setin2.github.io/stefan-cernat/

# Running locally & on the cloud (IaC)

## Running locally

The application is still being developed and has few functionalities thus far, thus the setup is easy.

1. First clone the repository and install all dependencies using `npm install`.
2. (Optional) If you wish to modify the app and register the changes simultaniously, run the command `npm run watch`.
3. You can start the application using `npm run webserver`, which will use `http-server` to host it on `http://localhost:1338/app/`.

## Running locally using Terraform & Docker (dev)

As the application will be further developed (and posibly hosted on the cloud) it will naturally have more dependencies. You can thus build the application using Docker through Terraform which will take care of the whole proccess. 

Doing so locally is not entirely necessary, as most of this can be done simply throught Docker. It can, however, be nice for testing and working with IaC. These are the steps:

1. Make sure you have Docker installed and running throught the command `sudo systemctl start docker` (only for linux).
2. Make sure you have terraform installed. If not, follow hashicorp documentation to install it.
3. Navigate to the terraform dev directory `cd terraform/dev/` and run `terraform init` to initialize terraform working directory and setting up all necessary files.
4. (Optional) Run `terraform plan` to see a plan of the desired state of the infrastructure.
5. Run `terraform apply`. After which you can likewise access the application on `http://localhost:1338/app/`.
6. (Optional) If you make any changes to the code, you can run `terraform apply`, and the changes will be reflected in the application.
6. (REMEMBER!) However, to run `terraform destroy` once done with the application, which will stop and destroy the docker image.

## Running on the cloud (prod)

TODO: not implemented yet. The folder `terraform/prod/` will contain the necessary configuration.