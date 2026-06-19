import mongoose from 'mongoose';

const tipoEstabelecimentoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  img: { type: String, required: true, unique: true },
  criadoEm: { type: Date, default: Date.now },
});

const TipoEstabelecimento = mongoose.model('TipoEstabelecimento', tipoEstabelecimentoSchema);

export default TipoEstabelecimento;  // Aqui garantimos que seja exportado como 'default'
