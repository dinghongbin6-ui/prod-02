variable "aws_region" {
  description = "AWS region for the VPC and EC2 instances."
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Short prefix used for resource names and tags."
  type        = string
  default     = "enterprise-ai"
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the VPC."
  type        = string
  default     = "10.40.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "Two non-overlapping public subnet CIDRs, one per Availability Zone."
  type        = list(string)
  default     = ["10.40.1.0/24", "10.40.2.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "Exactly two public subnet CIDRs are required."
  }

  validation {
    condition     = alltrue([for cidr in var.public_subnet_cidrs : can(cidrhost(cidr, 0))])
    error_message = "Every public subnet CIDR must be valid."
  }
}

variable "admin_cidr" {
  description = "Your trusted public IPv4 address in CIDR notation, normally x.x.x.x/32, for SSH and RDP only."
  type        = string

  validation {
    condition     = can(cidrhost(var.admin_cidr, 0)) && can(regex("/32$", var.admin_cidr))
    error_message = "admin_cidr must be a single trusted IPv4 address in /32 notation."
  }
}

variable "web_ingress_cidrs" {
  description = "Required CIDRs allowed to access the web application on ports 80 and 443. Use only corporate egress or approved client CIDRs."
  type        = list(string)

  validation {
    condition     = length(var.web_ingress_cidrs) > 0 && alltrue([for cidr in var.web_ingress_cidrs : can(cidrhost(cidr, 0))])
    error_message = "web_ingress_cidrs must contain at least one valid IPv4 CIDR."
  }
}

variable "key_name" {
  description = "Name of an existing EC2 key pair in aws_region, used for Linux SSH and Windows password decryption."
  type        = string

  validation {
    condition     = length(trimspace(var.key_name)) > 0
    error_message = "key_name must name an existing EC2 key pair."
  }
}

variable "linux_instance_type" {
  description = "EC2 instance type for the Linux application server."
  type        = string
  default     = "t3.medium"
}

variable "windows_instance_type" {
  description = "GPU-capable EC2 instance type for the Windows LM Studio server."
  type        = string
  default     = "g4dn.xlarge"
}

variable "windows_ami_id" {
  description = "Optional Windows AMI ID. When empty, the latest Amazon Windows Server 2022 English Full Base AMI is used."
  type        = string
  default     = ""
}

variable "linux_root_volume_size" {
  description = "Linux root EBS volume size in GiB."
  type        = number
  default     = 40
}

variable "windows_root_volume_size" {
  description = "Windows root EBS volume size in GiB; increase it for model files."
  type        = number
  default     = 150
}

variable "lmstudio_port" {
  description = "Private TCP port used by the LM Studio API."
  type        = number
  default     = 1234

  validation {
    condition     = var.lmstudio_port >= 1 && var.lmstudio_port <= 65535
    error_message = "lmstudio_port must be between 1 and 65535."
  }
}