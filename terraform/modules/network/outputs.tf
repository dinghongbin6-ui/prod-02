output "vpc_id" {
  description = "VPC ID."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs, ordered to match public_subnet_cidrs."
  value       = aws_subnet.public[*].id
}