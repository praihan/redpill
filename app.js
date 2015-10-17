var express = require('express');

app = express();
app.use(express.static('public'));

var port = process.argv[2] ? process.argv[2] : 0;
if (port === 0) {
  port = process.env.PORT || 1337;
}
app.set('port', port);

app.listen(app.get('port'), function() {
  console.log('Listening on port ' + app.get('port'));
});
