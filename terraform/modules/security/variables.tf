variable "project_name" {
  description = "Prefix used for security group names and tags."
  type        = string
}

variable "vpc_id" {
  description = "VPC where the security groups are created."
  type        = string
}

variable "admin_cidr" {
  description = "Administrator IPv4 CIDR (/32) for SSH and RDP."
  type        = string
}

variable "web_ingress_cidrs" {
  description = "Approved client CIDRs for the application web ports."
  type        = list(string)
}

variable "lmstudio_port" {
  description = "Private TCP port for the LM Studio API."
  type        = number
}