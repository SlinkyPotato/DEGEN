---
cover: >-
  https://images.unsplash.com/photo-1552664730-d307ca884978?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=2970&q=80
coverY: 0
---

# POAP Distribution Commands & Workflow

## ABOUT DEGEN

{% hint style="info" %}
DEGEN distributes POAPs by monitoring who participates in a Discord Voice Channel for an event. This can be a standard voice channel or a stage for events like community calls.

POAPs still need to be claimed from the POAP website; DEGEN simply automates distribution of the claim links.

<mark style="color:blue;background-color:orange;">**DEGEN POAP Distribution is a free service and are supported by donations.**</mark>

<mark style="color:blue;background-color:orange;">**Help our 9-person team keep rocking it and support us here:**</mark>**  **_<mark style="color:blue;background-color:orange;">**0x735FF6F197B0dc18eBEE127DD918d2111Eaf8220**</mark>_

_We accept any tokens and/or NFTs - your support is highly appreciated!_
{% endhint %}

## DEGEN Commands

### Before we start:

{% hint style="warning" %}
* Initial _/poap config modify_ **must** be ran by a user with `Administrator` permissions enabled within the roles settings ([see video (a) for tutorial](poap-distribution-commands-and-workflow.md#video-a))
{% endhint %}

#### _/poap config modify_

* Command for configuring which roles have access to POAP commands. Use this for assigning access to who can create POAP events on your server.

![](<../.gitbook/assets/poap config modify.png>)

#### Video (a)

{% embed url="https://www.youtube.com/watch?v=zuWUG3CmeYA" %}
HOW TO SET-UP DEGEN IN YOUR SERVER
{% endembed %}

__

#### _/poap config status_

* This displays the authorized users and roles that can use the POAP commands. Use this to add or remove roles.

![](<../.gitbook/assets/poap config status.png>)

<mark style="background-color:blue;">VIDEO (a)</mark>

### Before we start:

{% hint style="warning" %}
* The bot has a **10-minute timeout** to receive responses. If this exceeds, users will have to startover the process.
{% endhint %}

#### _/poap mint_

* This command allows you to schedule an event within the discord server. Here, you will be asked how many number of POAPs you’d like to mint for the event, followed by details of your event title, description, event start and end date, and your unique One Time Edit Code (used to make edits to the POAP event and allows you to mint more POAPs for additional participants).
* Upon providing all necessary details, DEGEN will then ask you for the PNG image you would like to mint followed by the email address where you’d like to receive the POAP links.txt file.

#### Here is a sample of confirmation:

![](<../.gitbook/assets/poap mint.png>)

#### If everything looks good hit "Y" for Yes and your POAP Event will be created.

{% hint style="success" %}
* You will get the links.txt (claim codes) file generated from the POAP set-up via email (usually takes 5min - 24hrs), so be cautious and schedule your events in advance ;)
{% endhint %}

{% hint style="warning" %}
* Remember to leave a month out from the event start and end date to give participants ample time to claim their links.
{% endhint %}

#### _/poap start_

* Upon running /poap start, DEGEN will ask you which platform you’d like to start the event (Discord/<mark style="background-color:red;">Twitter Spaces\[not available yet at the moment]</mark>), title of the event and in which voice channel the event is going to take place in.
* Once you choose the voice channel, you may set the duration on how long the event will be active and DEGEN will automatically monitor the voice channel selected upon receiving this confirmation:

![](<../.gitbook/assets/poap start.png>)

{% hint style="success" %}
* Attendees must be in the voice channel for a minimum of **10** minutes to be added to the log and qualify for a POAP from DEGEN.
{% endhint %}

\
_/**poap end**_

*   This command will trigger DEGEN to stop logging users. You will receive a DM with:

    \- The number of participants

    \- The channel the event took place in and;

    \- A csv file containing the details on who participated
* DEGEN will then ask for you to upload the POAP claim links and it will take the links from the links.txt file and DM them out to all the participants in the csv file.

![](<../.gitbook/assets/poap end.png>)

* If the POAP is not yet ready for distribution, you can let it time out and use the “/poap distribute” command later. Make sure to save the csv file with the list of participants for use with the “/poap distribute” command for later use.

{% hint style="warning" %}
* DEGEN _can both interact_ with users who has/has not DMs enabled for the server. If you want to receive a mint link automatically, please have DMs enabled otherwise type _/poap claim_.
* If you wish to distribute later, download the csv file DEGEN generates for you immediately after _/poap end_, this will be your list of attendees after event has ended.
* If you aren’t asked for the links.txt file, it’s OK. Just run a _/poap distribute_ command back in the discord text channel and upload the csv you saved, followed by the links.txt you received from POAP when you set up the event.
{% endhint %}

#### _/poap distribute_

* This command is for distributing POAPs after an event has ended. DEGEN will DM you with the POAP Distribution results along with the failed to send poaps csv file.

![](<../.gitbook/assets/poap distribution.png>)

{% hint style="warning" %}
* If participants have their DMs off, they will not receive their POAPs automatically but can run /poap claim to get their links.
{% endhint %}

#### _/poap claim_

* Claim your missing POAP for an event that you attended but did not receive. To qualify, you must have been in the discussion for 10 minutes and have not been deafened.

![](https://media.discordapp.net/attachments/867013446586204170/930772308006670376/Screenshot\_from\_2022-01-12\_18-36-23.png?width=361\&height=300)

{% hint style="info" %}
* If you wish to receive POAPs automatically on the next event. Shoot DEGEN a 'gm'
{% endhint %}

***

**Here's how your claim links would look like:**

![](<../.gitbook/assets/Screenshot from 2022-01-12 18-44-35.png>)

{% hint style="danger" %}
POAP ORGANIZERS: Remember to set proper expectations with your participants upon ending your call. If they don't know why they're receiving what from who, you as the organizer will be reported and will not be able to use DEGEN anymore.
{% endhint %}

#### Alternative uses:

* Using /poap distribute, you are able to upload a .csv file of selected users to distribute when a call doesn’t happen in discord. This would need to be a correctly formatted .csv file with the most important piece of data being the discord UserID, _not the username#xxxx_ which can be found through the following methods.
  * This will be a long string of numbers, like: 796987681226043082
  * [https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)
  * [https://www.swipetips.com/how-to-find-your-discord-user-id/](https://www.swipetips.com/how-to-find-your-discord-user-id/)

\\

**FAQs**

\\

_Is there a way to make it so that people who have their speakers muted and not participating during an entire call to not distribute a POAP to them using DEGEN?_

\- To encourage participation, DEGEN already resets the timer if a participant is deafened for more than 1 minute.

\\

_Can you tell me the funding DEGEN would need for another dao to use the platform?_

\- For POAP distribution, it’s a freely provided service. However, we welcome contributions via any ERC-20 or ERC-721 token to our multisig if they end up loving the service and are so inclined to contribute.\\

\
\\
