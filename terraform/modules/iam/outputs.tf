output "instance_profile_name" {
  description = "Instance profile name granting Systems Manager access to EC2."
  value       = aws_iam_instance_profile.ec2_ssm.name
}