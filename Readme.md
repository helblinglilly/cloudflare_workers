# Cloudflare workers

These are all separate projects.

## [avatar.helbling.uk](https://avatar.helbling.uk/hello?world)

Will use _anything_ that trails the domain as the seed to generate an svg avatar.

Handy when generating new user profiles.

## [socialpreview.helbling.uk](https://socialpreview.helbling.uk?link=https://helbling.uk)

`?link=any_website`

Light-weight debugging tool to work with metadata in the header of a page.

# Using Wrangler

### Install wranger

`npm i -g wrangler`

### Sign in

`wrangler login`

### Deploy

cd ./sample-worker

`wrangler deploy`

### Run

cd ./sample-worker

`npm run dev`
