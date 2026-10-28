variable "project_name" {
  description = "Prefix used for EC2 names and tags."
  type        = string
}

variable "key_name" {
  description = "Existing EC2 key pair name."
  type        = string
}

variable "linux_instance_type" {
  description = "Linux application EC2 instance type."
  type        = string
}

variable "windows_instance_type" {
  description = "Windows model EC2 instance type."
  type        = string
}

variable "windows_ami_id" {
  description = "Optional explicit Windows Server AMI ID."
  type        = string
}

variable "linux_root_volume_size" {
  description = "Linux root EBS volume size in GiB."
  type        = number
}

variable "windows_root_volume_size" {
  description = "Windows root EBS volume size in GiB."
  type        = number
}

variable "linux_subnet_id" {
  description = "Public subnet ID for the Linux application instance."
  type        = string
}

variable "windows_subnet_id" {
  description = "Public subnet ID for the Windows model instance."
  type        = string
}

variable "linux_private_ip" {
  description = "Static private IPv4 address for the Linux application instance."
  type        = string
}

variable "windows_private_ip" {
  description = "Static private IPv4 address for the Windows model instance."
  type        = string
}

variable "linux_security_group_id" {
  description = "Security group ID attached to the Linux application instance."
  type        = string
}

variable "windows_security_group_id" {
  description = "Security group ID attached to the Windows model instance."
  type        = string
}

variable "instance_profile_name" {
  description = "IAM instance profile used by both EC2 instances."
  type        = string
}

variable "windows_user_data" {
  description = "Windows first-boot firewall initialization script."
  type        = string
}