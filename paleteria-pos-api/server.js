const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {

  res.json({
    message: 'API ONLINE'
  })

})

app.listen(3000, () => {
  console.log('SERVER RUNNING')
})