const express = require("express");
const keys = require("./config/keys");
const stripe = require("stripe")(keys.stripeSecretKey);
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");

const app = express();
const port = process.env.PORT || 1111;

//stripe payment

//handlebars middleware
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//static folder (to put images etc.)
app.use(express.static(`${__dirname}/public`));

// homepage route
app.get("/", (req, res) => {
  res.render("index", {
    stripePublishableKey: keys.stripePublishableKey,
  });
});

// success page route
app.get("/success", (req, res) => {
  res.render("success");
});

// cancelled page route
app.get("/cancel", (req, res) => res.render("cancel"));

//paypal payment

const paypal = require("paypal-rest-sdk");

paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id: keys.paypalClientID,
  client_secret: keys.paypalSecretKey,
});

app.get("/", (req, res) => res.sendFile(__dirname + "/index"));

app.post("/pay", (req, res) => {
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: "https://payment-collection.herokuapp.com/success",
      cancel_url: "https://payment-collection.herokuapp.com/cancel",
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: "ePhone 12",
              sku: "001",
              price: "999.00",
              currency: "USD",
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: "USD",
          total: "999.00",
        },
        description: "Brand new ePhone12 is on sale!!",
      },
    ],
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === "approval_url") {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

app.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: ".00",
        },
      },
    ],
  };

  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        console.log(JSON.stringify(payment));
        res.send("Success");
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});
