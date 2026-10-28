data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

data "aws_ami" "windows_2022" {
  count       = var.windows_ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Windows_Server-2022-English-Full-Base-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

locals {
  windows_ami = var.windows_ami_id != "" ? var.windows_ami_id : data.aws_ami.windows_2022[0].id
}

resource "aws_instance" "linux_app" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.linux_instance_type
  subnet_id                   = var.linux_subnet_id
  private_ip                  = var.linux_private_ip
  associate_public_ip_address = true
  vpc_security_group_ids      = [var.linux_security_group_id]
  iam_instance_profile        = var.instance_profile_name
  key_name                    = var.key_name

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.linux_root_volume_size
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-linux-app"
    Role = "application"
  }
}

resource "aws_instance" "windows_model" {
  ami                         = local.windows_ami
  instance_type               = var.windows_instance_type
  subnet_id                   = var.windows_subnet_id
  private_ip                  = var.windows_private_ip
  associate_public_ip_address = true
  vpc_security_group_ids      = [var.windows_security_group_id]
  iam_instance_profile        = var.instance_profile_name
  key_name                    = var.key_name
  user_data                   = var.windows_user_data

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.windows_root_volume_size
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-windows-model"
    Role = "model-server"
  }
}