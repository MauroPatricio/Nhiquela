const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/nhiquela').then(async () => {
    const RequestService = require('./models/RequestServiceModel.js').default;
    const res = await RequestService.find({
        status: { $nin: ['Finalizado', 'Cancelado'] }
    }).select('status targetDriverId');
    console.log(res);
    process.exit(0);
});
