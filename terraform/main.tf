locals {
  linux_private_ip   = cidrhost(var.public_subnet_cidrs[0], 10)
  windows_private_ip = cidrhost(var.public_subnet_cidrs[1], 10)
  windows_user_data = templatefile("${path.root}/templates/windows-user-data.ps1.tftpl", {
    lmstudio_port    = var.lmstudio_port
    linux_private_ip = local.linux_private_ip
  })
}

module "network" {
  source = "./modules/network"

  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
}

module "security" {
  source = "./modules/security"

  project_name      = var.project_name
  vpc_id            = module.network.vpc_id
  admin_cidr        = var.admin_cidr
  web_ingress_cidrs = var.web_ingress_cidrs
  lmstudio_port     = var.lmstudio_port
}

module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
}

module "compute" {
  source = "./modules/compute"

  project_name              = var.project_name
  key_name                  = var.key_name
  linux_instance_type       = var.linux_instance_type
  windows_instance_type     = var.windows_instance_type
  windows_ami_id            = var.windows_ami_id
  linux_root_volume_size    = var.linux_root_volume_size
  windows_root_volume_size  = var.windows_root_volume_size
  linux_subnet_id           = module.network.public_subnet_ids[0]
  windows_subnet_id         = module.network.public_subnet_ids[1]
  linux_private_ip          = local.linux_private_ip
  windows_private_ip        = local.windows_private_ip
  linux_security_group_id   = module.security.linux_security_group_id
  windows_security_group_id = module.security.windows_security_group_id
  instance_profile_name     = module.iam.instance_profile_name
  windows_user_data         = local.windows_user_data
}