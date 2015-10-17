var express = require('express');

app = express();
app.use(express.static('public'));

var port = process.argv[2] ? process.argv[2] : 80;
app.listen(port);