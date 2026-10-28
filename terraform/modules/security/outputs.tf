output "linux_security_group_id" {
  description = "Security group ID for the Linux application EC2."
  value       = aws_security_group.linux.id
}

output "windows_security_group_id" {
  description = "Security group ID for the Windows model EC2."
  value       = aws_security_group.windows.id
}