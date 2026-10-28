resource "aws_security_group" "linux" {
  name        = "${var.project_name}-linux"
  description = "Web, restricted administration, and private model access for the Linux application server."
  vpc_id      = var.vpc_id

  egress = []

  tags = {
    Name = "${var.project_name}-linux-sg"
  }
}

resource "aws_security_group" "windows" {
  name        = "${var.project_name}-windows-model"
  description = "Restricted RDP administration and model API ingress from the Linux application server."
  vpc_id      = var.vpc_id

  egress = []

  tags = {
    Name = "${var.project_name}-windows-model-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "linux_web" {
  for_each          = toset(var.web_ingress_cidrs)
  security_group_id = aws_security_group.linux.id
  description       = "Web access from configured client CIDRs."
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "linux_https" {
  for_each          = toset(var.web_ingress_cidrs)
  security_group_id = aws_security_group.linux.id
  description       = "HTTPS access from configured client CIDRs."
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "linux_ssh" {
  security_group_id = aws_security_group.linux.id
  description       = "SSH only from the administrator public IP."
  cidr_ipv4         = var.admin_cidr
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

resource "aws_vpc_security_group_egress_rule" "linux_https" {
  security_group_id = aws_security_group.linux.id
  description       = "HTTPS for AWS Systems Manager and external APIs."
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "linux_http" {
  security_group_id = aws_security_group.linux.id
  description       = "HTTP for package repositories that do not redirect to HTTPS."
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "linux_to_model" {
  security_group_id            = aws_security_group.linux.id
  description                  = "LM Studio API access to the Windows instance only."
  referenced_security_group_id = aws_security_group.windows.id
  ip_protocol                  = "tcp"
  from_port                    = var.lmstudio_port
  to_port                      = var.lmstudio_port
}

resource "aws_vpc_security_group_ingress_rule" "windows_rdp" {
  security_group_id = aws_security_group.windows.id
  description       = "RDP only from the administrator public IP."
  cidr_ipv4         = var.admin_cidr
  ip_protocol       = "tcp"
  from_port         = 3389
  to_port           = 3389
}

resource "aws_vpc_security_group_ingress_rule" "windows_model_api" {
  security_group_id            = aws_security_group.windows.id
  description                  = "LM Studio API only from the Linux application security group."
  referenced_security_group_id = aws_security_group.linux.id
  ip_protocol                  = "tcp"
  from_port                    = var.lmstudio_port
  to_port                      = var.lmstudio_port
}

resource "aws_vpc_security_group_egress_rule" "windows_https" {
  security_group_id = aws_security_group.windows.id
  description       = "HTTPS for LM Studio, model, driver, and Windows updates."
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "windows_http" {
  security_group_id = aws_security_group.windows.id
  description       = "HTTP for software repositories that do not redirect to HTTPS."
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}