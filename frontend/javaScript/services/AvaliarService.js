import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function enviarAvaliacao(dados, baseEndpoint) {
    return fetchJsonComAuth(`${baseEndpoint}/avaliacoes`, dados, 'POST');
}