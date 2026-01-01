+++
title = "Cybersecurity HomeLab Project"
date = 2024-08-20
description = "A comprehensive guide on building a cybersecurity homelab to simulate real-world IT environments."
slug = "cybersecurity-homelab-project"
authors = ["David"]
tags = ["Homelab", "Cybersecurity", "Active Directory", "Splunk", "Nessus", "pfSense"]
categories = ["Projects", "Cybersecurity"]
externalLink = ""
series = []
+++

![Start](/images/posts/cybersecurity-homelab-project/homelab_diagram.jpg)

### What’s a “Home Lab” in cybersecurity?

A cybersecurity homelab is a small-scale environment that aims to simulate real-world IT components within an enterprise network. Building a homelab is always a great way to put your hands-on experience and get your understanding deepen about how computer systems work by performing various activities such as software installation, configurations and management of security tools.

In the following post i’ll be sharing relevant information about the setup that i designed and implemented, included diagrams, software and hardware specifications as well as the procedures i performed in chronological order to give you a general view about what you have to do in case you’re interested on engage with that project.

### Hardware specifications

*   **Mac M1 Pro** 512GB/16GB
*   **Huawei Matebook D15** 512GB/8GB
*   **Raspberry Pi Zero 2 W**

### Software specifications

*   [VMWare Fusion](https://blogs.vmware.com/teamfusion/2024/05/fusion-pro-now-available-free-for-personal-use.html)
*   [VirtualBox](https://www.virtualbox.org/wiki/Downloads)
*   [Windows Server 2022](https://www.microsoft.com/es-es/evalcenter/download-windows-server-2022)
*   [Ubuntu Server 22.04 & 24.04 LTS](https://ubuntu.com/download/server)
*   [OpenVPN](https://openvpn.net/as-docs/ubuntu.html#install-updates-and-set-the-correct-time-76593)
*   [Nessus](https://www.tenable.com/downloads/nessus?loginAttempted=true)
*   [Splunk Enterprise](https://www.splunk.com/en_us/download/splunk-enterprise.html)
*   [pfSense Community Edition](https://archive.org/details/pfSense-CE-2.6.0-RELEASE-amd64)

![Network Topology](/images/posts/cybersecurity-homelab-project/securecorp_topology.png)

### Performed activities

1.  Setup a dedicated router for laboratory (Optional)
2.  Download and install virtualization software
3.  Download and setup Windows server
4.  Configure static IP address and **Domain Controller (DC)**
5.  Add **Active Directory Domain Services** features
6.  Configure **DNS** and **DHCP** servers
7.  Join Windows machine to the Active Directory environment to check if previous configurations are correctly applied
8.  Create main OU(s) and user accounts
9.  Setup **Folder redirection** feature through GPO (Plus)
10. Create, configure and link **Group Policy Object** to OU(s)
11. Configure and secure **Remote Desktop Protocol** server (RDP)
12. Setup **VPN server** with AD services via LDAP
13. Configure and perform vulnerability scans with “**Nessus**”
14. Install and setup “**Splunk Enterprise**” as SIEM platform (Security Information and Event Management)
15. Securing network with **pfSense firewall**

![Devices Distribution](/images/posts/cybersecurity-homelab-project/devices_distribution.png)

### Developed skills

As mentioned earlier, a cybersecurity homelab is an excellent way to deepen your understanding of computer systems and cybersecurity concepts. Here are some skills you can put into practice:

*   Problem-solving
*   Virtualization
*   Security auditing
*   Vulnerability scanning
*   Troubleshooting
*   Systems maintenance

### Recommendations

*   If you encounter issues related to a **Group Policy Object (GPO)**, try applying a “force update” from the servers or workstations involved. Use the following command to enforce the changes on the current host:

```bash
gpupdate /force
```

*   If you encounter issues with any of the configured services (such as DHCP, DNS, folder redirection, etc.), check the service’s events dashboard for more detailed information on what might be going wrong. Additionally, the “Event Viewer” is a valuable tool for examining Windows logs. According to the cause sometimes even a simple “Restart service” may help.

*   In simulated real-world IT scenarios, it’s beneficial to have a workstation connected to the “enterprise” network that functions as a “threat actor.” This setup is crucial for understanding how security events are generated and gaining insight into the attacker’s perspective.

[View project details](https://github.com/birdm4nw/Cybersecurity-HomeLab)
