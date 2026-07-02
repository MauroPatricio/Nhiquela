const fs = require('fs');

const files = [
    '../backend/routes/requestDeliverRoutes.js',
    '../backend/routes/orderRoutes.js'
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        const searchRegex = /phoneNumber:\s*user_deliver\.deliveryman\?\.phoneNumber\s*\|\|\s*''/g;
        if (searchRegex.test(content)) {
            content = content.replace(searchRegex, "phoneNumber:  user_deliver.deliveryman?.phoneNumber || user_deliver.phoneNumber || 0");
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Patched ${file}`);
        } else {
            console.log(`Regex did not match in ${file}`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
}
