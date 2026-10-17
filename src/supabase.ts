/**
 * Configuración de Supabase para GestiónDoc
 * Reemplaza las constantes siguientes con los datos de tu proyecto de Supabase.
 */

import { createClient } from '@supabase/supabase-js';

// ==========================================
// PEGA AQUÍ TUS CREDENCIALES DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://bthbpjatoedfkjvwxnuh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_V3eIFgQcsHe_GgnUfSJ4RQ_az75A_0M';

// Cliente de Supabase (utiliza la clave pública / anon key)
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
