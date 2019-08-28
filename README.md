# Landing page - V2

## 0. Meta - what is this?
This is a fragment of a company's landing site.

## 1. Prerequisites
To run this software on your local machine
- the repository cloned to your machine 
- have Node.js installed
- have MongoDB installed
- have an `env.local.json` at the root directory of the application

### 1.1. Clone the repository to your machine
* Open a command prompt
* Clone the repository to the `landing-page-v2` directory:
```sh
git clone https://github.com/Entazis/Landing-page-v2.git`
```

### 1.2. Installing Node.js
* Go to https://nodejs.org/en/
* Download & install the version you prefer.

### 1.3. Installing MongoDB
* Go to https://www.mongodb.com/
* Download & install MongoDB.

### 1.4. Installing Nodemon
* In your command prompt, install Nodemon globally:
```sh
npm install -g nodemon
```

### 1.5. Get the `env.local.json` file
* Ask for the `env.local.json` file from one of your peers.

## 2. Running the application
### 2.1. Start MongoDB
Open a terminal and type this to start MongoDB:
```sh
mongod
```

### 2.1. Run the application in your command prompt
Open another terminal, and type this:
```sh
npm start
```
This will do the following:
- install dependencies
- start a Node.js server on your computer, which can be accessed at `http://localhost:3030` from your browser
- watch for code changes, so if you change anything in your application folder (eg. you update your code, modify a file etc.), it restarts the Node.js server (so when you refresh your page in the browser, you’ll see the newest version all the time)

### 2.2. View the application from your browser
In your browser, type this to see the appilcation:
`http://localhost:3030`



## 3. Where is everything

Check out the following folders & files.

### 3.1. Assets

`/public/assets/…` 
Here are all the css, img, js, vendor folders. If you want to access anything here, in the HTML code just use `/assets/...`

### 3.2. Routing

`/app/site/router.js`
This file shows the URLs we handle (eg. `/` or `/hu/press`).

### 3.3. Views

`/app/site/index/` directory 
This has the HTML files in it, instead of `.html` we use `.hbs`, as we are using Handlebars as a templating engine (it can handle including files, using variables and so on).

`/app/site/partials` directory
This one has the partials (eg. navbar, footer), that are used multiple times all around the website. Use the `{{>partial-name}}` syntax in the page to include something from here.

## Built With

* HTML, CSS, JavaScript, Bootstrap
* Node.JS, Express.JS
* MongoDB

