-- 1. Create the table
CREATE TABLE public.value_strategies (
    id serial PRIMARY KEY,
    virality_axis text NOT NULL,
    content_method text NOT NULL,
    value_purpose text NOT NULL,
    practical_example text NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.value_strategies ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow authenticated users to read the data
CREATE POLICY "Allow read access to all authenticated users"
ON public.value_strategies
FOR SELECT
TO authenticated
USING (true);

-- 4. Insert all the data
INSERT INTO public.value_strategies (virality_axis, content_method, value_purpose, practical_example) VALUES
('EMOCIÓN (Humor)', 'Meme con Comentario Contextual', 'Identificación inmediata con un dolor común del nicho.', 'Meme del perro con café con texto: "Yo, a las 3 a.m., esperando que el algoritmo me dé alcance orgánico."'),
('EMOCIÓN (Sorpresa)', '"Plot Twist" de 7 Segundos', 'Romper expectativas con un giro inesperado que fomenta el re-visionado.', 'Muestras un proceso de cocina complejo y terminas usando un producto de comida rápida.'),
('EMOCIÓN (Autenticidad)', 'Video de "Detrás de Cámaras" Sincero', 'Humanizar la marca mostrando errores o el lado real y divertido del trabajo.', 'El fail o blooper del CEO intentando grabar un tutorial serio.'),
('EMOCIÓN (Curiosidad/Indignación)', 'Experimento Social Relevante', 'Generar debate y reflexión sobre un problema social o de consumo.', 'Entrevistar gente en la calle preguntando sobre un mito financiero básico.'),
('EMOCIÓN (Inspiración)', 'Storytelling de Superación (Carrusel)', 'Conectar emocionalmente narrando el fracaso y el éxito posterior.', '"Cómo un error de $10.000 me enseñó esta lección clave para mi negocio."'),
('EMOCIÓN (Controversia)', 'Crítica Radical a una Tendencia', 'Desafiar una "regla" establecida en la industria para generar debate.', 'Video: "¿Por qué el ''Trabaja Duro'' es el peor consejo de productividad que existe?"'),
('EMOCIÓN (Identificación)', 'Entrevista Rápida con "Gente Común"', 'Mostrar que las experiencias del usuario son universales y divertidas.', '"¿Cuál es tu peor experiencia comprando online en el Black Friday?"'),
('EMOCIÓN (Esperanza)', 'Campaña de "Acto de Bondad"', 'Inspirar a la audiencia mostrando a la marca ayudando genuinamente.', 'Pagar la cuenta de un cliente que está comenzando su emprendimiento.'),
('EMOCIÓN (Humor)', 'Uso de Audio Viral Fuera de Contexto', 'Adaptar una canción o sonido popular a una situación incómoda del día a día laboral.', 'Reel usando audio viral sobre una frustración común con el email del cliente.'),
('EMOCIÓN (Diversión)', 'Reto o Challenge con Recompensa', 'Invitar a la acción masiva pidiendo imitar un desafío simple y útil.', '"El #RetoDeOrganización: 3 pasos para limpiar tu escritorio en 60 segundos."'),
('UTILIDAD (Inmediatez)', 'Mini-Tutorial "Stop-Motion"', 'Enseñar un proceso completo en un tiempo mínimo, ideal para guardar.', 'Video sin voz mostrando el montaje de un mueble o la solución a un bug de software en 15 segundos.'),
('UTILIDAD (Recurso)', 'Guía Definitiva en PDF (Sin Lead)', 'Ofrecer un recurso de alto valor sin barreras (sin pedir email) para maximizar la difusión.', 'Un Checklist de "100 Puntos a Revisar Antes de Lanzar tu Web" descargable.'),
('UTILIDAD (Ahorro de Tiempo)', 'Hoja de Trucos (Cheat Sheet)', 'Proporcionar una imagen o carrusel con atajos esenciales o comandos.', 'Infografía con todos los atajos de teclado de Photoshop o Excel.'),
('UTILIDAD (Claridad)', 'Infografía de Proceso Complejo', 'Simplificar un flujo de trabajo difícil en una imagen digerible.', 'Un diagrama de flujo que explica las 10 etapas de la inversión inmobiliaria.'),
('UTILIDAD (Educación Básica)', 'Diccionario de Nicho para Principiantes', 'Aclarar términos técnicos que confunden a la audiencia nueva.', 'Carrusel explicando 5 términos de marketing digital que la gente suele usar mal.'),
('UTILIDAD (Decisión)', 'Post "Esto vs. Aquello" (Comparativa)', 'Ayudar al usuario a tomar una decisión de compra con un análisis imparcial.', 'Artículo o reel comparando el iPhone vs. Android para fotógrafos.'),
('UTILIDAD (Herramienta)', 'Plantilla Editable Gratuita', 'Ofrecer una herramienta lista para usar que ahorre horas de trabajo.', 'Un archivo de Google Sheets editable para crear un presupuesto mensual.'),
('UTILIDAD (Conocimiento Crítico)', 'Desmentir una Falla de Producto Popular', 'Proporcionar información que el fabricante no da, generando confianza.', 'Video analizando por qué una función de un móvil famoso falla y cómo desactivarla.'),
('UTILIDAD (Evidencia)', 'Case Study Basado en Métricas Abiertas', 'Compartir los números reales (tráfico, ROI, engagement) de un proyecto.', 'Post con captura de pantalla de Google Analytics de un éxito de contenido.'),
('UTILIDAD (Asesoría)', '"Ask Me Anything" (AMA) en Vivo', 'Ofrecer asesoría gratuita y personalizada a través de una sesión de preguntas.', 'Sesión en vivo de 30 minutos respondiendo preguntas técnicas sobre programación.'),
('TIMING (Perspectiva)', 'Comentario Rápido a una Noticia (Op-Ed)', 'Relacionar un evento de actualidad con los principios de tu nicho.', 'Publicación de texto dando tu opinión profesional sobre el último cambio de tasa de interés.'),
('TIMING (Humor)', 'Parodia de un Comercial Famoso', 'Aprovechar la popularidad de una campaña publicitaria del momento.', 'Recrear un anuncio viral de Coca-Cola, pero sustituyendo la bebida por tu producto.'),
('TIMING (Adaptación)', 'Uso de Trend Musical con Gesto Educativo', 'Usar el audio de moda en un Reel para mostrar datos y consejos importantes.', 'Reel con baile sencillo señalando en pantalla 5 datos de tu industria.'),
('TIMING (Resumen)', 'El "Top 5" de la Semana/Mes', 'Ahorrar tiempo a tu audiencia recapitulando las noticias más importantes.', 'Carrusel con "Las 5 noticias tecnológicas más relevantes de la semana".'),
('TIMING (Juego)', 'Bracket o Encuesta de Votación Viral', 'Crear una competencia interactiva y divertida basada en la actualidad.', 'Poner a competir a los 8 mejores libros de marketing del año en un torneo de votación.'),
('TIMING (Sinceridad)', 'Video de Reacción en Tiempo Real', 'Mostrar una opinión espontánea y sin filtros sobre un lanzamiento o evento.', 'Grabar tu reacción inmediata al anuncio de un nuevo iPhone o consola.'),
('TIMING (Visión)', 'Análisis Predictivo (Forecasting)', 'Compartir predicciones audaces sobre el futuro de la industria.', 'Post con 3 predicciones polémicas sobre el futuro del trabajo remoto en 2026.'),
('TIMING (Educación)', '"Behind the Trend" (Análisis de Tendencia)', 'Explicar la psicología o las razones detrás de una moda viral.', 'Video que desglosa por qué un challenge de TikTok se hizo tan popular.'),
('TIMING (Nostalgia)', 'Recapitulación Anual / Fin de Año', 'Mirar hacia atrás para celebrar los éxitos y el valor entregado.', 'Carrusel de "Los 10 Hacks más útiles que compartimos este año".'),
('TIMING (Solución)', 'Respuesta Directa a una Pregunta en Tendencia', 'Usar un hashtag popular para resolver una duda específica.', 'Video de 30 segundos usando un trend para responder una duda fiscal del momento.'),
('COMUNIDAD (Reconocimiento)', 'Contenido Generado por el Usuario (UGC)', 'Validar y reconocer la creatividad de los clientes y seguidores.', 'Publicar un repost de un cliente que usa tu producto de una forma innovadora.'),
('COMUNIDAD (Desafío)', 'Trivia o Quiz de Conocimiento', 'Fomentar la participación y probar los conocimientos de la audiencia.', 'Preguntas de opción múltiple en Stories sobre datos curiosos de tu nicho de mercado.'),
('COMUNIDAD (Alcance)', 'Colaboración con un Micro-Influencer', 'Unir audiencias y validar el mensaje con una voz creíble en un nicho.', 'Un Live conjunto con un pequeño experto en software poco conocido pero útil.'),
('COMUNIDAD (Co-Creación)', 'Sondeo o Encuesta de Decisión', 'Hacer que la audiencia se sienta dueña del contenido al decidir la próxima pieza.', 'Preguntar en Stories si prefieren un post sobre "Finanzas" o "Productividad" la próxima semana.'),
('COMUNIDAD (Interacción)', 'Reto de Comentarios Masivos', 'Incentivar la respuesta masiva con una promesa de contenido exclusivo.', '"Comenta la palabra CLAVE para desbloquear una plantilla gratuita en mi DM."'),
('COMUNIDAD (Atención)', 'Respuesta en Video a un Comentario', 'Personalizar la interacción al responder a una pregunta común con un video.', 'Grabar un Reel respondiendo a una pregunta interesante dejada en la publicación anterior.'),
('COMUNIDAD (Transparencia)', 'Contenido de "Preguntas Frecuentes Polémicas"', 'Demostrar apertura al abordar temas difíciles o críticas de la marca.', 'Video respondiendo a las 5 preguntas más incómodas que se hacen sobre tu servicio.'),
('COMUNIDAD (Inclusión)', 'Crea un Glosario Colaborativo', 'Pedir definiciones o ideas a la audiencia para un recurso futuro.', 'Post pidiendo a la gente que defina el éxito en una sola palabra en los comentarios.'),
('COMUNIDAD (Feedback)', 'Revisión de Portafolios o Trabajos', 'Ofrecer valor a cambio de visibilidad, dando críticas constructivas.', 'Sesión en vivo revisando y dando feedback al diseño gráfico de los seguidores.'),
('COMUNIDAD (Diversión)', 'Crea un GIF o Sticker de la Marca', 'Crear un elemento fácil de compartir en chats que represente una emoción de la marca.', 'Un GIF animado de un empleado haciendo un gesto de alegría por un logro.'),
('PROFUNDIDAD (Resumen Auditivo)', 'Clip de Podcast con Subtítulos Dinámicos', 'Convertir contenido largo en una "muestra" de alto valor y fácil digestión.', 'Un clip de 60 segundos de la frase más impactante de una entrevista de 1 hora.'),
('PROFUNDIDAD (Narrativa)', '"Hilos" o Threads de X (Twitter)', 'Contar una historia o resumir un artículo largo en una cadena de publicaciones.', 'Resumir una investigación de 3,000 palabras en 12 tweets narrativos y enganchantes.'),
('PROFUNDIDAD (Motivación)', 'Citas Inspiracionales con Gráfico de Datos', 'Dar un golpe de inspiración basado en evidencia dura.', 'Una frase motivacional extraída de tu Ebook, acompañada de la métrica que la valida.'),
('PROFUNDIDAD (Micro-Educación)', 'Reel con "Mini-Clase" de Webinar', 'Destilar los puntos más valiosos de un evento largo en un video muy corto.', 'Recortar 3 consejos clave de un webinar de 60 minutos en un Reel de 45 segundos.'),
('PROFUNDIDAD (Expectativa)', 'El "Teaser" del Próximo Proyecto', 'Generar entusiasmo y anticipación por algo grande que está por llegar.', 'Video corto mostrando el behind the scenes de la portada de tu próximo libro.'),
('PROFUNDIDAD (Referencia)', 'Póster "Imprimible" de Reglas de Oro', 'Crear un recurso que la audiencia querrá guardar, imprimir o usar de fondo de pantalla.', 'Un diseño minimalista con las "5 Reglas Fundamentales del Buen Ahorrador".'),
('PROFUNDIDAD (Estructura)', 'Mapa Mental o Diagrama Único', 'Organizar conceptos complejos de una manera visualmente atractiva y fácil de entender.', 'Un diagrama que muestre las interconexiones entre el Branding, el SEO y el Marketing de Contenidos.'),
('PROFUNDIDAD (Curiosidad)', 'Video de "Lo que no sabías"', 'Revelar hechos poco conocidos que provienen de la experiencia interna de la marca.', '"3 cosas que pasaron cuando lanzamos nuestro primer producto que nunca te contamos."'),
('PROFUNDIDAD (Transparencia)', 'Tabla de Precios o Comparación de Servicios', 'Mostrar el valor de manera transparente en relación a la competencia (objetivamente).', 'Una imagen simple comparando las características clave de tu software vs. el líder del mercado.'),
('PROFUNDIDAD (Humanización)', 'La Carta Abierta (Mensaje Genuino)', 'Un post de texto extenso que explica la misión y el porqué de la marca.', 'Publicación en LinkedIn explicando el motivo personal por el que comenzaste tu negocio.');
