// O 'fetchJsonComAuth' é trocado por 'fetchFormDataComAuth'
import { fetchFormDataComAuth } from "../utils/fetchHelper.js";

// A função agora envia FormData
export async function enviarAvaliacao(formData, baseEndpoint) {
    return fetchFormDataComAuth(`${baseEndpoint}/avaliacoes`, formData, 'POST');
}