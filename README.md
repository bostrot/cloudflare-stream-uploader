# [cloudflare-stream-uploader](https://github.com/bostrot/cloudflare-stream-uploader)

## Disclaimer

Not finished. Do not use in production workflows without re-checking everything. Also you should include your own authentication model.

## Short description

This is a little example of how to use the currently in beta Cloudflare Stream which lets you easily publish your videos to the web without thinking on storage and nasty video compression, encoding etc. Written in a relatively short period of time there could be some bugs. Please report them as issues or fix them and upload via a pull request. That said complexity is a problem now and there aren't many comments too so keep that in mind while going through the code.

## What it does

It comes with a little GUI that let users select a description, title, thumbnail etc and uploads a video through a proxy server to the cloudflare servers to not expose your CF API key. Videos are chunked through flow.js (as cloudflare accepts up to 100MB per file only) and rewritten on the server which acts as a proxy. Those videos are uploaded to Cloudflare which then will be encoded etc.
It also tries to check whether videos already exists in your cloudflare account by running an SHA1 check with a custom hashing algorithm over the client side (browser) and then the same when it is uploaded to the server.

## Workflow

This example could help people who want to create their own video platforms to handle all that video progressing. An uploader for thumbnail images is included though it uploads all images to imgur with their API. The GUI uses currently three colors for the different processes: some blue for uploading to your server, green for uploading to cloudflare and yellow for encoding from cloudflares site.

## Starting

Running the index.js file with node should create a custom node webserver on port 80 (customize if you want).
Add your cloudflare certificates (for strict ssl) in certs under `server.crt` and `server.key`. You don't need to do that but in that case remove it from the code.

```js
git clone https://github.com/bostrot/cloudflare-stream-uploader.git
cd cloudflare-stream-uploader
node index.js
```


![thumbnail](https://i.imgur.com/0H8MKUw.png)


## Help

Join the forum if you need help: [discuss.bostrot.com](https://discuss.bostrot.com)

You are welcome to contribute with pull requests, bug reports, ideas and donations.

Bitcoin: [1ECPWeTCq93F68BmgYjUgGSV11XuzSPSeM](https://www.blockchain.com/btc/payment_request?address=1ECPWeTCq93F68BmgYjUgGSV11XuzSPSeM&currency=USD&nosavecurrency=true&message=Bostrot)

PayPal: [paypal.me/bostrot](https://paypal.me/bostrot)

Hosting: [2.50$ VPS at VULTR](https://www.vultr.com/?ref=7505919)
