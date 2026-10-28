# AWS Terraform 部署

此目录创建一个 VPC、两个不同可用区的公有子网，以及两台 EC2：Linux 运行本项目，Windows 运行 LM Studio。两个实例通过 VPC 内的私有 IP 通信；LM Studio API 不对互联网开放。

## 模块结构

```text
terraform/
	main.tf                 # root module：组装子模块和跨模块参数
	variables.tf            # 环境级输入
	outputs.tf              # 对外输出
	versions.tf             # Terraform/AWS Provider 约束
	modules/
		network/              # VPC、Internet Gateway、公有子网和路由
		security/             # Linux/Windows 安全组和最小权限规则
		iam/                  # EC2 SSM Role 与 Instance Profile
		compute/              # AMI 查询及 Linux/Windows EC2 实例
```

root module 只负责把网络输出传给安全组和计算模块、把安全组与 IAM 输出传给 EC2 模块；子模块通过 `variables.tf` 定义输入、`outputs.tf` 暴露结果，不直接读取其他模块内部资源。

## 架构与安全组

- Linux EC2 位于公有子网 1，Windows EC2 位于公有子网 2；两个子网路由到同一个 Internet Gateway。
- Linux 和 Windows 都分配公有 IP，方便初始 SSH/RDP；SSH 22 和 RDP 3389 仅允许 `admin_cidr` 指定的单个公网 IPv4 `/32`。
- Linux 的 80/443 由必填变量 `web_ingress_cidrs` 控制；必须配置为公司出口或明确批准的客户端 CIDR。
- Windows 的 LM Studio API 端口默认是 1234，只允许 Linux EC2 安全组访问；Linux 出站到模型服务器也只放行该端口。
- 两台 EC2 使用 SSM 实例角色、IMDSv2、加密 gp3 根卷。没有 NAT Gateway，以降低成本；更新和下载通过公有子网的 Internet Gateway 出站。
- Terraform 不会安装应用、LM Studio、GPU 驱动或模型，也不会配置域名/TLS。

## 前置条件

1. 安装 Terraform CLI（版本需为 1.6 或更高）和 AWS CLI。
2. 准备有权限创建 VPC、EC2、安全组、IAM Role/Instance Profile 的 AWS 凭证。使用 AWS IAM Identity Center/SSO 或受控的部署角色，不要把 Access Key 写入 Terraform 文件。
3. 在目标区域创建 EC2 Key Pair，并安全保存私钥。Linux SSH 和 Windows 管理员密码解密都需要它。
4. 确认该区域有至少两个可用区、所选 GPU 实例类型可用，并已申请足够的 EC2 GPU 实例配额。默认 Windows 类型为 `g4dn.xlarge`，请按模型需求和预算调整。
5. 查出当前管理员公网 IPv4。不要把 `admin_cidr` 改为 `0.0.0.0/0`。

## 创建基础设施

在项目根目录执行 PowerShell：

```powershell
aws configure sso
aws sts get-caller-identity
Copy-Item terraform/terraform.tfvars.example terraform/terraform.tfvars
```

编辑 `terraform/terraform.tfvars`：

```hcl
aws_region   = "ap-northeast-1"
project_name = "enterprise-ai"
admin_cidr   = "你的管理员公网IPv4/32"
key_name     = "目标区域中已有的EC2密钥对名称"

# 必须替换为公司批准的公网出口/客户端 CIDR。
web_ingress_cidrs = ["203.0.113.0/24"]

linux_instance_type   = "t3.medium"
windows_instance_type = "g4dn.xlarge"
```

示例中的管理员 IP 和 Key Pair 名称是占位值，必须替换。然后执行：

```powershell
Set-Location terraform
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

检查 plan 中的区域、AMI、实例类型、私网地址和安全组规则后再 apply。GPU EC2 通常成本较高，验证完成后不使用时可停止实例；停止期间 EBS 仍收费。

## 配置 Windows 模型机

1. 从 `terraform output` 取 `windows_public_ip`，在 EC2 控制台选择 **Get Windows password**，使用创建实例时指定的私钥解密，然后从 `admin_cidr` 对应的网络通过 RDP 登录。
2. 安装适用于该 GPU 实例和 Windows AMI 的 NVIDIA 驱动。默认选择的是普通 Windows Server 2022 AMI，不保证已预装 GPU 驱动；确认设备管理器和 LM Studio 均能识别 GPU。
3. 安装 LM Studio，下载聊天模型及 embedding 模型。模型文件通常较大，检查根卷容量；需要时在 `terraform.tfvars` 增大 `windows_root_volume_size` 后重新 plan/apply。
4. 在 LM Studio 启动兼容 OpenAI API 的本地服务，并启用局域网访问/监听非 loopback 地址（通常是 `0.0.0.0`）。不要只监听 `localhost`，否则 Linux EC2 无法连接。服务端口必须与 `lmstudio_port` 一致。
5. Terraform 的 Windows 首启脚本已添加 Windows 防火墙规则，仅允许 Linux 实例固定私网地址访问模型端口；AWS 安全组也会限制来源为 Linux 安全组。

## 部署应用到 Linux

从 `terraform output` 取得 SSH 命令，用对应私钥登录。示例为 Amazon Linux 2023：

```bash
sudo dnf update -y
sudo dnf install -y nginx git
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
```

将项目部署到服务器后，在项目目录安装和构建：

```bash
npm ci
npm run build
sudo npm install -g pm2
pm2 start backend/server.js --name enterprise-ai-api
pm2 save
```

给 Nginx 配置静态目录为项目的 `dist/`，并把 `/api/` 反向代理到 `http://127.0.0.1:3001/`。本项目生产前端使用 `VITE_API_BASE_URL=/api`；因此浏览器访问应用与 API 同源，不需要开放 3001 入站端口。配置 HTTPS 时绑定域名并安装受信任证书；Terraform 只开放 443，并不自动提供 TLS 证书或 Nginx 配置。

在 Linux 项目根目录创建 `.env`（权限设为 `600`），不要将真实密钥提交到 Git，也不要放进 Terraform user data 或 tfvars：

```dotenv
PORT=3001
VITE_API_BASE_URL=/api
LMSTUDIO_API=http://<windows-private-ip>:1234/v1/chat/completions
LMSTUDIO_embeddings_API=http://<windows-private-ip>:1234/v1/embeddings
LMSTUDIO_MODEL=<LM-Studio中加载的模型标识>
LMSTUDIO_KEY=<与LM-Studio服务端设置一致的密钥；若未启用鉴权则按程序配置处理>
MAX_CONCURRENT_CHATS=4
AUTH_SECRET=<至少32字符的随机值>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<首次创建管理员使用的强密码>
CORS_ORIGINS=
```

`windows-private-ip` 使用 `terraform output windows_private_ip`。其他天气、搜索等 API 密钥按应用实际需要写入 `.env`。首次启动前确认 `AUTH_SECRET` 和 `ADMIN_PASSWORD` 已设置；启动后可通过 `pm2 logs enterprise-ai-api` 查看日志。

如果需要改用其他 VPC 内的 Windows 主机，请同步检查 Windows 安全组、Windows Defender Firewall、LM Studio 监听地址，以及 Linux `.env` 中的两个私网 API URL。

## 部署后检查

从 Linux EC2 验证网络和 API 可达性：

```bash
curl http://<windows-private-ip>:1234/v1/models
curl http://127.0.0.1:3001/health
pm2 status
```

从允许的客户端网络打开 Linux 公网 IP 或域名，确认前端、登录、问答和文档检索正常。若 API 超时，依次检查 LM Studio 服务是否启动、监听是否包含私网网卡、Windows 防火墙、两侧安全组以及 API URL 是否使用 Windows **私网 IP**。

## 状态文件与销毁

Terraform state 可能包含基础设施信息，应保存在受控且加密的位置。当前配置使用本地 state，已被 `.gitignore` 排除；团队/生产环境建议迁移至启用加密和版本控制的 S3 backend，并启用 state locking。不要把 `terraform.tfstate` 或 `terraform.tfvars` 提交到仓库。

删除此配置创建的资源前，先确认数据已备份：

```powershell
terraform destroy
```

销毁会删除 EC2 及其根卷，实例上的模型文件和未备份数据也会丢失。
