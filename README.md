# Overview

This **Module 3 Project** is a simple web application I built to practice using **HTML, CSS, and JavaScript**. The main purpose of the website is to show different Food recipes categories, display items inside each category, and show extra information on the About page. All the data is stored inside the browser using **localStorage**, so the website still works even if it is offline.

The user can:
1. Open the home page and see the main content.  
2. Go to the Categories page and see a list of items.  
3. View each category’s details, which are loaded from `database.js`.  
4. Read the About page to understand what the website is about.  

My purpose for writing this software was to improve my skills in DOM manipulation, page navigation, styling, and handling browser-based data.

# Local Storage System

This project uses the browser’s **localStorage** to save information such as:
- Selected category  
- Item details  
- User choices or interactions on the site  

This helps the website keep simple data without a server.

### Data Structure:
- **Category Data** is stored in `database.js`  
- **User Selections** stored with keys like `selectedCategory`  

Supported operations:
- **Create** – Save selected category  
- **Read** – Load items from the database  
- **Update** – Change selections  
- **Delete** – Clear saved data when needed  

# Development Environment

- **HTML5** – Structure and pages (`index.html`, `categories.html`, `about.html`)  
- **CSS3** – Styling for layout, fonts, and simple design (`style.css`)  
- **JavaScript (ES6)** – Main logic in (`script.js`, `categories.js`, `about.js`)  
- **localStorage API** – Saves category/user selections  
- **VS Code** – Used to write and test the project  
- **Live Server** – For testing page navigation  

# Useful Websites

- https://developer.mozilla.org/  
- https://www.w3schools.com/  
- https://css-tricks.com/  
- https://javascript.info/  

# Future Work

- Add animations to make the UI smoother  
- Improve the design and spacing  
- Add more items and categories  
- Add search or filter functions  
- Add a small database system (JSON import/export)  
- Improve accessibility for all users  
