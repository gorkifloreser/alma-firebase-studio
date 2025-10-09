
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('value_strategies')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('virality_axis', 'text', (col) => col.notNull())
    .addColumn('content_method', 'text', (col) => col.notNull())
    .addColumn('value_purpose', 'text', (col) => col.notNull())
    .addColumn('practical_example', 'text', (col) => col.notNull())
    .execute();

  // Seed with initial data
  const initialStrategies = [
    { virality_axis: 'EMOCIÓN (Humor)', content_method: 'Meme con Comentario Contextual', value_purpose: 'Identificación inmediata con un dolor común del nicho.', practical_example: 'Meme del perro con café con texto: "Yo, a las 3 a.m., esperando que el algoritmo me dé alcance orgánico."' },
    { virality_axis: 'EMOCIÓN (Sorpresa)', content_method: '"Plot Twist" de 7 Segundos', value_purpose: 'Romper expectativas con un giro inesperado que fomenta el re-visionado.', practical_example: 'Muestras un proceso de cocina complejo y terminas usando un producto de comida rápida.' },
    { virality_axis: 'EMOCIÓN (Autenticidad)', content_method: 'Video de "Detrás de Cámaras" Sincero', value_purpose: 'Humanizar la marca mostrando errores o el lado real y divertido del trabajo.', practical_example: 'El fail o blooper del CEO intentando grabar un tutorial serio.' },
    { virality_axis: 'EMOCIÓN (Curiosidad/Indignación)', content_method: 'Experimento Social Relevante', value_purpose: 'Generar debate y reflexión sobre un problema social o de consumo.', practical_example: 'Entrevistar gente en la calle preguntando sobre un mito financiero básico.' },
    { virality_axis: 'EMOCIÓN (Inspiración)', content_method: 'Storytelling de Superación (Carrusel)', value_purpose: 'Conectar emocionalmente narrando el fracaso y el éxito posterior.', practical_example: '"Cómo un error de $10.000 me enseñó esta lección clave para mi negocio."' },
    { virality_axis: 'EMOCIÓN (Controversia)', content_method: 'Crítica Radical a una Tendencia', value_purpose: 'Desafiar una "regla" establecida en la industria para generar debate.', practical_example: 'Video: "¿Por qué el \'Trabaja Duro\' es el peor consejo de productividad que existe?"' },
    { virality_axis: 'EMOCIÓN (Identificación)', content_method: 'Entrevista Rápida con "Gente Común"', value_purpose: 'Mostrar que las experiencias del usuario son universales y divertidas.', practical_example: '"¿Cuál es tu peor experiencia comprando online en el Black Friday?"' },
    { virality_axis: 'EMOCIÓN (Esperanza)', content_method: 'Campaña de "Acto de Bondad"', value_purpose: 'Inspirar a la audiencia mostrando a la marca ayudando genuinamente.', practical_example: 'Pagar la cuenta de un cliente que está comenzando su emprendimiento.' },
    { virality_axis: 'EMOCIÓN (Humor)', content_method: 'Uso de Audio Viral Fuera de Contexto', value_purpose: 'Adaptar una canción o sonido popular a una situación incómoda del día a día laboral.', practical_example: 'Reel usando audio viral sobre una frustración común con el email del cliente.' },
    { virality_axis: 'EMOCIÓN (Diversión)', content_method: 'Reto o Challenge con Recompensa', value_purpose: 'Invitar a la acción masiva pidiendo imitar un desafío simple y útil.', practical_example: '"El #RetoDeOrganización: 3 pasos para limpiar tu escritorio en 60 segundos."' },
    { virality_axis: 'UTILIDAD (Inmediatez)', content_method: 'Mini-Tutorial "Stop-Motion"', value_purpose: 'Enseñar un proceso completo en un tiempo mínimo, ideal para guardar.', practical_example: 'Video sin voz mostrando el montaje de un mueble o la solución a un bug de software en 15 segundos.' },
    { virality_axis: 'UTILIDAD (Recurso)', content_method: 'Guía Definitiva en PDF (Sin Lead)', value_purpose: 'Ofrecer un recurso de alto valor sin barreras (sin pedir email) para maximizar la difusión.', practical_example: 'Un Checklist de "100 Puntos a Revisar Antes de Lanzar tu Web" descargable.' },
    { virality_axis: 'UTILIDAD (Ahorro de Tiempo)', content_method: 'Hoja de Trucos (Cheat Sheet)', value_purpose: 'Proporcionar una imagen o carrusel con atajos esenciales o comandos.', practical_example: 'Infografía con todos los atajos de teclado de Photoshop o Excel.' },
    { virality_axis: 'UTILIDAD (Claridad)', content_method: 'Infografía de Proceso Complejo', value_purpose: 'Simplificar un flujo de trabajo difícil en una imagen digerible.', practical_example: 'Un diagrama de flujo que explica las 10 etapas de la inversión inmobiliaria.' },
    { virality_axis: 'UTILIDAD (Educación Básica)', content_method: 'Diccionario de Nicho para Principiantes', value_purpose: 'Aclarar términos técnicos que confunden a la audiencia nueva.', practical_example: 'Carrusel explicando 5 términos de marketing digital que la gente suele usar mal.' },
    { virality_axis: 'UTILIDAD (Decisión)', content_method: 'Post "Esto vs. Aquello" (Comparativa)', value_purpose: 'Ayudar al usuario a tomar una decisión de compra con un análisis imparcial.', practical_example: 'Artículo o reel comparando el iPhone vs. Android para fotógrafos.' },
    { virality_axis: 'UTILIDAD (Herramienta)', content_method: 'Plantilla Editable Gratuita', value_purpose: 'Ofrecer una herramienta lista para usar que ahorre horas de trabajo.', practical_example: 'Un archivo de Google Sheets editable para crear un presupuesto mensual.' },
    { virality_axis: 'UTILIDAD (Conocimiento Crítico)', content_method: 'Desmentir una Falla de Producto Popular', value_purpose: 'Proporcionar información que el fabricante no da, generando confianza.', practical_example: 'Video analizando por qué una función de un móvil famoso falla y cómo desactivarla.' },
    { virality_axis: 'UTILIDAD (Evidencia)', content_method: 'Case Study Basado en Métricas Abiertas', value_purpose: 'Compartir los números reales (tráfico, ROI, engagement) de un proyecto.', practical_example: 'Post con captura de pantalla de Google Analytics de un éxito de contenido.' },
    { virality_axis: 'UTILIDAD (Asesoría)', content_method: '"Ask Me Anything" (AMA) en Vivo', value_purpose: 'Ofrecer asesoría gratuita y personalizada a través de una sesión de preguntas.', practical_example: 'Sesión en vivo de 30 minutos respondiendo preguntas técnicas sobre programación.' },
    { virality_axis: 'TIMING (Perspectiva)', content_method: 'Comentario Rápido a una Noticia (Op-Ed)', value_purpose: 'Relacionar un evento de actualidad con los principios de tu nicho.', practical_example: 'Publicación de texto dando tu opinión profesional sobre el último cambio de tasa de interés.' },
    { virality_axis: 'TIMING (Humor)', content_method: 'Parodia de un Comercial Famoso', value_purpose: 'Aprovechar la popularidad de una campaña publicitaria del momento.', practical_example: 'Recrear un anuncio viral de Coca-Cola, pero sustituyendo la bebida por tu producto.' },
    { virality_axis: 'TIMING (Adaptación)', content_method: 'Uso de Trend Musical con Gesto Educativo', value_purpose: 'Usar el audio de moda en un Reel para mostrar datos y consejos importantes.', practical_example: 'Reel con baile sencillo señalando en pantalla 5 datos de tu industria.' },
    { virality_axis: 'TIMING (Resumen)', content_method: 'El "Top 5" de la Semana/Mes', value_purpose: 'Ahorrar tiempo a tu audiencia recapitulando las noticias más importantes.', practical_example: 'Carrusel con "Las 5 noticias tecnológicas más relevantes de la semana".' },
    { virality_axis: 'TIMING (Juego)', content_method: 'Bracket o Encuesta de Votación Viral', value_purpose: 'Crear una competencia interactiva y divertida basada en la actualidad.', practical_example: 'Poner a competir a los 8 mejores libros de marketing del año en un torneo de votación.' },
    { virality_axis: 'TIMING (Sinceridad)', content_method: 'Video de Reacción en Tiempo Real', value_purpose: 'Mostrar una opinión espontánea y sin filtros sobre un lanzamiento o evento.', practical_example: 'Grabar tu reacción inmediata al anuncio de un nuevo iPhone o consola.' },
    { virality_axis: 'TIMING (Visión)', content_method: 'Análisis Predictivo (Forecasting)', value_purpose: 'Compartir predicciones audaces sobre el futuro de la industria.', practical_example: 'Post con 3 predicciones polémicas sobre el futuro del trabajo remoto en 2026.' },
    { virality_axis: 'TIMING (Educación)', content_method: '"Behind the Trend" (Análisis de Tendencia)', value_purpose: 'Explicar la psicología o las razones detrás de una moda viral.', practical_example: 'Video que desglosa por qué un challenge de TikTok se hizo tan popular.' },
    { virality_axis: 'TIMING (Nostalgia)', content_method: 'Recapitulación Anual / Fin de Año', value_purpose: 'Mirar hacia atrás para celebrar los éxitos y el valor entregado.', practical_example: 'Carrusel de "Los 10 Hacks más útiles que compartimos este año".' },
    { virality_axis: 'TIMING (Solución)', content_method: 'Respuesta Directa a una Pregunta en Tendencia', value_purpose: 'Usar un hashtag popular para resolver una duda específica.', practical_example: 'Video de 30 segundos usando un trend para responder una duda fiscal del momento.' },
    { virality_axis: 'COMUNIDAD (Reconocimiento)', content_method: 'Contenido Generado por el Usuario (UGC)', value_purpose: 'Validar y reconocer la creatividad de los clientes y seguidores.', practical_example: 'Publicar un repost de un cliente que usa tu producto de una forma innovadora.' },
    { virality_axis: 'COMUNIDAD (Desafío)', content_method: 'Trivia o Quiz de Conocimiento', value_purpose: 'Fomentar la participación y probar los conocimientos de la audiencia.', practical_example: 'Preguntas de opción múltiple en Stories sobre datos curiosos de tu nicho de mercado.' },
    { virality_axis: 'COMUNIDAD (Alcance)', content_method: 'Colaboración con un Micro-Influencer', value_purpose: 'Unir audiencias y validar el mensaje con una voz creíble en un nicho.', practical_example: 'Un Live conjunto con un pequeño experto en software poco conocido pero útil.' },
    { virality_axis: 'COMUNIDAD (Co-Creación)', content_method: 'Sondeo o Encuesta de Decisión', value_purpose: 'Hacer que la audiencia se sienta dueña del contenido al decidir la próxima pieza.', practical_example: 'Preguntar en Stories si prefieren un post sobre "Finanzas" o "Productividad" la próxima semana.' },
    { virality_axis: 'COMUNIDAD (Interacción)', content_method: 'Reto de Comentarios Masivos', value_purpose: 'Incentivar la respuesta masiva con una promesa de contenido exclusivo.', practical_example: '"Comenta la palabra CLAVE para desbloquear una plantilla gratuita en mi DM."' },
    { virality_axis: 'COMUNIDAD (Atención)', content_method: 'Respuesta en Video a un Comentario', value_purpose: 'Personalizar la interacción al responder a una pregunta común con un video.', practical_example: 'Grabar un Reel respondiendo a una pregunta interesante dejada en la publicación anterior.' },
    { virality_axis: 'COMUNIDAD (Transparencia)', content_method: '"Preguntas Frecuentes Polémicas"', value_purpose: 'Demostrar apertura al abordar temas difíciles o críticas de la marca.', practical_example: 'Video respondiendo a las 5 preguntas más incómodas que se hacen sobre tu servicio.' },
    { virality_axis: 'COMUNIDAD (Inclusión)', content_method: 'Crea un Glosario Colaborativo', value_purpose: 'Pedir definiciones o ideas a la audiencia para un recurso futuro.', practical_example: 'Post pidiendo a la gente que defina el éxito en una sola palabra en los comentarios.' },
    { virality_axis: 'COMUNIDAD (Feedback)', content_method: 'Revisión de Portafolios o Trabajos', value_purpose: 'Ofrecer valor a cambio de visibilidad, dando críticas constructivas.', practical_example: 'Sesión en vivo revisando y dando feedback al diseño gráfico de los seguidores.' },
    { virality_axis: 'COMUNIDAD (Diversión)', content_method: 'Crea un GIF o Sticker de la Marca', value_purpose: 'Crear un elemento fácil de compartir en chats que represente una emoción de la marca.', practical_example: 'Un GIF animado de un empleado haciendo un gesto de alegría por un logro.' },
    { virality_axis: 'PROFUNDIDAD (Resumen Auditivo)', content_method: 'Clip de Podcast con Subtítulos Dinámicos', value_purpose: 'Convertir contenido largo en una "muestra" de alto valor y fácil digestión.', practical_example: 'Un clip de 60 segundos de la frase más impactante de una entrevista de 1 hora.' },
    { virality_axis: 'PROFUNDIDAD (Narrativa)', content_method: '"Hilos" o Threads de X (Twitter)', value_purpose: 'Contar una historia o resumir un artículo largo en una cadena de publicaciones.', practical_example: 'Resumir una investigación de 3,000 palabras en 12 tweets narrativos y enganchantes.' },
    { virality_axis: 'PROFUNDIDAD (Motivación)', content_method: 'Citas Inspiracionales con Gráfico de Datos', value_purpose: 'Dar un golpe de inspiración basado en evidencia dura.', practical_example: 'Una frase motivacional extraída de tu Ebook, acompañada de la métrica que la valida.' },
    { virality_axis: 'PROFUNDIDAD (Micro-Educación)', content_method: 'Reel con "Mini-Clase" de Webinar', value_purpose: 'Destilar los puntos más valiosos de un evento largo en un video muy corto.', practical_example: 'Recortar 3 consejos clave de un webinar de 60 minutos en un Reel de 45 segundos.' },
    { virality_axis: 'PROFUNDIDAD (Expectativa)', content_method: 'El "Teaser" del Próximo Proyecto', value_purpose: 'Generar entusiasmo y anticipación por algo grande que está por llegar.', practical_example: 'Video corto mostrando el behind the scenes de la portada de tu próximo libro.' },
    { virality_axis: 'PROFUNDIDAD (Referencia)', content_method: 'Póster "Imprimible" de Reglas de Oro', value_purpose: 'Crear un recurso que la audiencia querrá guardar, imprimir o usar de fondo de pantalla.', practical_example: 'Un diseño minimalista con las "5 Reglas Fundamentales del Buen Ahorrador".' },
    { virality_axis: 'PROFUNDIDAD (Estructura)', content_method: 'Mapa Mental o Diagrama Único', value_purpose: 'Organizar conceptos complejos de una manera visualmente atractiva y fácil de entender.', practical_example: 'Un diagrama que muestre las interconexiones entre el Branding, el SEO y el Marketing de Contenidos.' },
    { virality_axis: 'PROFUNDIDAD (Curiosidad)', content_method: 'Video de "Lo que no sabías"', value_purpose: 'Revelar hechos poco conocidos que provienen de la experiencia interna de la marca.', practical_example: '"3 cosas que pasaron cuando lanzamos nuestro primer producto que nunca te contamos."' },
    { virality_axis: 'PROFUNDIDAD (Transparencia)', content_method: 'Tabla de Precios o Comparación de Servicios', value_purpose: 'Mostrar el valor de manera transparente en relación a la competencia (objetivamente).', practical_example: 'Una imagen simple comparando las características clave de tu software vs. el líder del mercado.' },
    { virality_axis: 'PROFUNDIDAD (Humanización)', content_method: 'La Carta Abierta (Mensaje Genuino)', value_purpose: 'Un post de texto extenso que explica la misión y el porqué de la marca.', practical_example: 'Publicación en LinkedIn explicando el motivo personal por el que comenzaste tu negocio.' },
  ];

  await db.insertInto('value_strategies').values(initialStrategies).execute();

  // Enable RLS and add policies
  await db.schema.alterTable('value_strategies').alter((builder) => builder.enableRowLevelSecurity()).execute();

  await db.schema.createPolicy('Allow read access to all users')
      .for('value_strategies').on('SELECT').to('authenticated')
      .using('true').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('value_strategies').execute();
}
