output "vpc_id" {
  description = "ID of the application VPC."
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "The two public subnet IDs."
  value       = module.network.public_subnet_ids
}

output "linux_public_ip" {
  description = "Public IP of the Linux application server."
  value       = module.compute.linux_public_ip
}

output "linux_private_ip" {
  description = "Private IP used by the application server to reach LM Studio."
  value       = module.compute.linux_private_ip
}

output "windows_public_ip" {
  description = "Public IP of the Windows model server for administrator RDP."
  value       = module.compute.windows_public_ip
}

output "windows_private_ip" {
  description = "Private IP used by the Linux application server to reach LM Studio."
  value       = module.compute.windows_private_ip
}

output "lmstudio_chat_endpoint" {
  description = "Private OpenAI-compatible chat completions endpoint for the application .env."
  value       = "http://${module.compute.windows_private_ip}:${var.lmstudio_port}/v1/chat/completions"
}

output "lmstudio_embeddings_endpoint" {
  description = "Private embeddings endpoint for the application .env."
  value       = "http://${module.compute.windows_private_ip}:${var.lmstudio_port}/v1/embeddings"
}

output "linux_ssh_command" {
  description = "SSH command; the source address must match admin_cidr."
  value       = "ssh -i <private-key-file> ec2-user@${module.compute.linux_public_ip}"
}