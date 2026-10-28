output "linux_instance_id" {
  description = "Linux application EC2 instance ID."
  value       = aws_instance.linux_app.id
}

output "linux_public_ip" {
  description = "Linux application EC2 public IPv4 address."
  value       = aws_instance.linux_app.public_ip
}

output "linux_private_ip" {
  description = "Linux application EC2 private IPv4 address."
  value       = aws_instance.linux_app.private_ip
}

output "windows_instance_id" {
  description = "Windows model EC2 instance ID."
  value       = aws_instance.windows_model.id
}

output "windows_public_ip" {
  description = "Windows model EC2 public IPv4 address."
  value       = aws_instance.windows_model.public_ip
}

output "windows_private_ip" {
  description = "Windows model EC2 private IPv4 address."
  value       = aws_instance.windows_model.private_ip
}