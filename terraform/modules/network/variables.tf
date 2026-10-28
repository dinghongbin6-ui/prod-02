variable "project_name" {
  description = "Prefix used for names and tags."
  type        = string
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "Exactly two public subnet CIDRs."
  type        = list(string)
}