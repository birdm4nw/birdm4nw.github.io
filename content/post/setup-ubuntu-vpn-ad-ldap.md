---
title: "Set up Ubuntu server as VPN server on Active Directory via LDAP"
date: 2024-07-16T12:00:00Z
draft: false
tags: ["Ubuntu", "VPN", "Active Directory", "LDAP"]
---

![VPN Diagram](/images/posts/setup-ubuntu-vpn-ad-ldap/vpn-diagram.gif)

Active Directory is a centralized directory service created by Microsoft to efficiently and securely manage devices, users, domains and objects within a network. Today, a large number of companies worldwide use AD to increase productivity in their operations and bring order to their organizational structures, offering the end customer:

- **Security**: Group policies and access controls that limit users to access existing resources on the network and use of applications based on their role.
- **Extensibility**: Organizations can organize and scale their business according to their business needs.
- **Simplicity**: The presence of administrators allows setting policies, rules and access controls in a centralized manner that simplifies business operations.
- **Fast troubleshooting**: If an event occurs within the AD environment, there are a number of pre-installed control tools that facilitate the identification and resolution of problems.

Occasionally organizations have the need to join machines or users to their active directory environment that are outside the local network, that is when VPN’s present themselves as an interesting solution to provide access to the directory service to a remote user, so that they can access the existing business resources securely and without much hassle.

## Join Ubuntu Server to AD environment

1. Download Ubuntu Server image from official website, make sure to choose a LTS version.  
   [Download here](https://ubuntu.com/download/server)

2. Install the downloaded ISO on a virtualization application (virtual box, VMWare).

3. Once Ubuntu Server has been installed on a virtual machine update and upgrade.

   ```bash
   sudo apt update && sudo apt upgrade
   ```

4. Configure date and time by running the following commands and selecting your current location:

   ```bash
   sudo apt install tzdata sudo dpkg-reconfigure tzdata
   ```
   ![Timezone](/images/posts/setup-ubuntu-vpn-ad-ldap/01.png)

5. Download the following packages to join to Active Directory later:

   ```bash
   sudo apt install -y realmd libnss-sss libpam-sss sssd sssd-tools adcli samba-common-bin oddjob oddjob-mkhomedir packagekit
   ```

6. Change the hostname of your machine, adding the domain name:

   ```bash
   sudo hostnamectl set-hostname HOSTNAME.ad-domain-name
   ```
   ![Hostname](/images/posts/setup-ubuntu-vpn-ad-ldap/02.png)

   where:
   - **VPN-SERVER**: Hostname
   - **securecorp.local**: Active Directory domain name

7. Look for the content of the DNS hostname resolution file and make sure to see something like this in the last lines:  
   `/etc/resolv.conf`
   ![resolv.conf](/images/posts/setup-ubuntu-vpn-ad-ldap/03.png)
   - `options edns0 trust-ad`: Allows the resolver to trust the authenticity of DNS responses as indicated by the DNS servers
   - `search securecorp.local`: Search for AD domain name.

8. Open the following DNS resolve file, uncomment and add the values according to your case:  
   `/etc/systemd/resolved.conf`  
   ![resolved.conf](/images/posts/setup-ubuntu-vpn-ad-ldap/04.png)
   where:
   - **DNS**: Active Directory’s DNS server
   - **Domains**: AD domain(s) name(s)

9. Look for the AD domain name and join:

   ```bash
   sudo realm discover ad-domain-name
   ```
   ![Realm Discover](/images/posts/setup-ubuntu-vpn-ad-ldap/05.png)

   ```bash
   sudo realm join -U Administrator ad-domain-name
   ```

   After this last command don’t forget to provide Administrator password, which correspond to the DC (Domain Controller) Administrator password.
   Now, restart the machine and log in again, check if your machine is part of the domain objects by running:

   ```bash
   sudo realm list
   ```
   ![Realm List](/images/posts/setup-ubuntu-vpn-ad-ldap/06.png)

   As you can see, everything is correct and now the ubuntu server virtual machine is part of the AD domain!

## Configure VPN server on Ubuntu Server VM

10. Go to OpenVPN website, create an account and log in:  
    [OpenVPN Web](https://myaccount.openvpn.com/signin/as)

11. Once you’re logged go to Install Access Server option on left bar, you’ll see this:  
    ![Install Access Server](/images/posts/setup-ubuntu-vpn-ad-ldap/07.png)
    Copy the command on your Ubuntu Server and run it as root user.
    The last command will install OpenVPN access server on your VM.

12. You’ll see something very similar once the installation has been completed with success:  
    ![Install Success](/images/posts/setup-ubuntu-vpn-ad-ldap/08.png)
    Copy the password and go to the Admin UI on the browser, log in with the showed credentials.

13. Go to Configuration > Activation and paste the activation key that you got after login into OpenVPN web (step 10). The key is on Activation Keys option on left bar.  
    ![Activation](/images/posts/setup-ubuntu-vpn-ad-ldap/09.png)
    
    OpenVPN Admin UI
    ![Admin UI](/images/posts/setup-ubuntu-vpn-ad-ldap/10.png)
    - You’ll get 2 VPN connection within a free plan.

14. Now, let’s go to Server Manager on our Domain Controller to configure and extract some information for the VPN server.  
    ![Server Manager](/images/posts/setup-ubuntu-vpn-ad-ldap/11.png)
    - An Organization Unit (OU) has been created to have a better organization of users within out AD environment. Notice that only the users in this OU will be able to use the VPN, that’s why it has been called with that specific name.

    So make sure to create a vpn-admin user or something like that, exclusively for the VPN administrative configuration and add other users that you want to make part of the OU for future VPN connections.

    **Do not forget the credentials!**

15. It’s time to check if vpn-admin is able to authenticate to the AD server via LDAP. So open the execution window by clicking Windows + r and run the following command:

    ```cmd
    ldp.exe
    ```

    A LDAP panel will be opened so go to Connection > Connect on the navigation menu and put the IP address of the AD server.
    ![LDAP Connect](/images/posts/setup-ubuntu-vpn-ad-ldap/12.png)

16. Click on ok and then go to Connection > Bind, set “Bind with credentials” as Bind type and type the correct credentials for vpn-admin, who will be the bridge for our VPN connections later.  
    ![LDAP Bind](/images/posts/setup-ubuntu-vpn-ad-ldap/13.png)
    You should see a view like the following one if you have permissions to connect to the server via LDAP, so let’s continue.
    ![LDAP Permissions](/images/posts/setup-ubuntu-vpn-ad-ldap/14.png)

17. Open PowerShell and run the following command to display a complete information about users and groups within out AD.

    ```powershell
    dsquery user
    ```
    ![dsquery](/images/posts/setup-ubuntu-vpn-ad-ldap/15.png)

18. Come back to OpenVPN Admin UI and go to Authentication > LDAP and fill the following labels based on the extracted information from last command.  
    ![OpenVPN LDAP](/images/posts/setup-ubuntu-vpn-ad-ldap/16.png)
    Save changes and update server.

19. Go to Authentication > Settings and select LDAP as “Default Authentication Systems”. Save and update then.  
    To apply all the changes go to Ubuntu Server terminal and restart the OpenVPN service by running:

    ```bash
    sudo systemctl restart openvpnas
    ```

## Connect client to VPN server

20. From client machine download OpenVPN client program.  
    [OpenVPN client](https://openvpn.net/client/client-connect-vpn-for-windows/)

21. Install and open desktop application, enter the VPN server URL and accept the certificate.  
    - Notice that in this case the VPN server is running in locally, so the IP address is the local one, in case that you want to run it to access from remote the IP address should be the public one of your Ubuntu Server.
    <div style="display: flex; gap: 10px;">
        <img src="/images/posts/setup-ubuntu-vpn-ad-ldap/17.png" alt="VPN Client" style="width: 48%;">
        <img src="/images/posts/setup-ubuntu-vpn-ad-ldap/18.png" alt="VPN Client Certificate" style="width: 48%;">
    </div>

22. If the VPN server is active the application will redirect you to the fill the next form, where you have to supply credentials that matches with users that belong to VPN Users OU.
    <div style="display: flex; gap: 10px;">
        <img src="/images/posts/setup-ubuntu-vpn-ad-ldap/19.png" alt="VPN Login" style="width: 48%;">
        <img src="/images/posts/setup-ubuntu-vpn-ad-ldap/20.png" alt="VPN Connected" style="width: 48%;">
    </div>

**¡Voilà!**

Now you have a VPN server working successfully on the Active Directory environment where users can authenticate via LDAP.

## Troubleshooting & Notes

This was a practical guide of how to setup a ubuntu server vm as VPN server for you Active Directory environment, please know that:

- You can also configure AD users login on Ubuntu Server to access with an AD user account and get a user home dir on `/home/username@ad-domain-name`. (optional)
- In this practical guide the VPN is running on local, which means that can’t be access from out of the network. In case you want to access from outside the steps are almost the same, just consider these changes:

  - Change your Ubuntu Server local IP for the public one.
  - Configure firewall rules to allow traffic on ports 443/TCP, 943/TCP, 945/TCP and 1194/UDP.
  - In case you can’t access to your Ubuntu Server after make these changes go to your router configuration and add some port forwarding rules to expose local VPN server ports remotely. Try to use not common ports for public exposure, it can be dangerous.

-----
## Resources
- [Set up Access Server with AD via LDAP](https://openvpn.net/as-docs/tutorials/tutorial--active-directory-ldap.html)

> “The pleasures arising from thinking and learning will make us think and learn all the more.”  
> **Aristotle**
