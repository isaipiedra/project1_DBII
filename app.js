import express, { json } from 'express';

/*Cassandra*/
import { init_cassandra, 
  add_comment, 
  get_all_comments, 
  get_all_comments_by_dataset,
  update_comment_visibility, reply_comment,
  get_comment_replies, update_reply_visibility,
  add_dataset_vote, get_votes_by_dataset, get_votes_by_user,
  record_new_download, get_downloads_by_dataset, start_conversation,
  get_user_conversations, conversation_exists,send_message, get_conversation_messages} 
  from './Cassandra/cassandra_methods.js';


const app = express();
const port = 3000;

app.use(json());
app.use(express.static('public'));

/*Cassandra methods start here*/
app.post('/api/add_comment', async (req, res)=> {  
  try{
    const {id_dataset, user_name, comment, visible} = req.body || {};  
    if(!id_dataset || !user_name || !comment){
      return res.status(400).json({ error: "Faltan 'id_dataset', 'user_name' o 'comment'." });
    }
    const saved = await add_comment({id_dataset, user_name, comment, visible});
    res.json(saved)
  }catch(error){
    console.error("add_comment error:", error);
    res.status(500).json({error : "Error"});
  }
});

app.get('/api/get_all_comments_by_dataset', async (req, res) =>{
  try{
    const { id_dataset, visible } = req.query; 
    if (!id_dataset) {
      return res.status(400).json({ error: "Falta 'id_dataset'." });
    }

    let visibleFilter = undefined;
    if (visible === 'true') {
      visibleFilter = true;
    } else if (visible === 'false') {
      visibleFilter = false;
    }

    const rows = await get_all_comments_by_dataset(id_dataset, {visible: visibleFilter
    });

    res.json(rows);

  }catch(error)
  {
    console.error("get_all_comments_by_dataset error:", error);
    res.status(500).json({error : "Error"});
  }
});

app.get('/api/get_all_comments', async (req, res)=>{
  try{
    const rows = await get_all_comments();
    res.json(rows);

  }catch(error){
    console.error("get_all_comments error:", error);
    res.status(500).json({error : "Error"});
  }
});

/**Functions which receives id_dataset and id_comment as strings but visibility as bool xd.
 * It updates the state of a comment.
 */
app.put('/api/update_comment_visibility', async(req, res)=>{
  try {
      const {id_dataset, id_comment, visible} = req.body;

      if (!id_dataset || !id_comment) {
        return res.status(400).json({ 
          error: "Faltan 'id_dataset' o 'id_comment'." 
        });
      }
      
      if (visible === undefined || visible === null) {
        return res.status(400).json({ 
          error: "Falta 'visible' (debe ser true o false)." 
        });
      }

      const rows = await update_comment_visibility(id_dataset, id_comment, visible);
      res.json(rows);

  } catch (error) {
      console.error("update_comment_visibility error:", error);
      res.status(500).json({error : "Error"});
  }
});

/**Reply section -------------------------------------------------------------------------- */
app.post('/api/reply_comment', async(req, res)=>{
  try{
      const {id_comment, username, reply, visible} = req.body || {};  
      if(!id_comment || !username || !reply){
        return res.status(400).json({ error: "Faltan 'id_comment', 'username' o 'reply'." });
      }
      const saved = await reply_comment({id_comment, username, reply, visible});
      res.json(saved)
  }catch(error){
      console.error("reply_comment' error:", error);
      res.status(500).json({error : "Error"});
  }
});

app.get('/api/get_comment_replies', async(req, res) => {
  try {
    const { id_comment, visible } = req.query; 
    if (!id_comment) {
      return res.status(400).json({ error: "Falta 'id_comment'." });
    }

    let visibleFilter = undefined;
    if (visible === 'true') {
      visibleFilter = true;
    } else if (visible === 'false') {
      visibleFilter = false;
    }

    const rows = await get_comment_replies(id_comment, { 
      visible: visibleFilter 
    });

    res.json(rows);
  } catch(error) {
    console.error("'get_comment_replies' error:", error);
    res.status(500).json({error : "Error"});
  }
});

app.put('/api/update_reply_visibility', async(req, res)=>{
  try{
    const {id_comment, reply_id, visible} = req.body;
    if(!id_comment || !reply_id){
      return res.status(400).json({error: "Falta 'id_comment' o 'reply_id'"});
    }
    if (visible === undefined || visible === null) {
      return res.status(400).json({ error: "Falta 'visible' (debe ser true o false)."});
    }

    const rows = await update_reply_visibility(id_comment, reply_id, visible);
    res.json(rows);

  }catch(error){
    console.error("'update_reply_visibility' error:", error);
    res.status(500).json({error : "Error"});
  }
});

/*Calification section------------------------------------------------------------ */
app.post('/api/add_dataset_vote', async (req, res) => {
  try {
    const { dataset_id, user_id, dataset_name, dataset_description, user_name, calification } = req.body;

    if (!dataset_id || !user_id || !dataset_name || !user_name) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: 'dataset_id', 'user_id', 'dataset_name', 'user_name'" 
      });
    }

    if (calification === undefined || calification === null) {
      return res.status(400).json({ 
        error: "Falta 'calification'" 
      });
    }

    // Aqui podemos cambiar la validación pero siento que la más logica es del uno al cinco xd
    const calificationNum = parseInt(calification);
    if (isNaN(calificationNum) || calificationNum < 1 || calificationNum > 5) {
      return res.status(400).json({ error: "'calification' debe ser un número entre 1 y 5" });
    }

    const result = await add_dataset_vote({dataset_id,user_id,dataset_name, dataset_description, user_name, calification: calificationNum});

    res.json(result);

  } catch (error) {
    console.error("add_dataset_vote error:", error);
    res.status(500).json({ error: "Error al agregar voto" });
  }
});

/**
 * Function which retrieves all the database voters using the database's id as parameter
 */
app.get('/api/get_votes_by_dataset', async (req, res) => {
  try {
    const { dataset_id } = req.query;
    if (!dataset_id) {
      return res.status(400).json({ error: "Falta 'dataset_id'" });
    }
    const rows = await get_votes_by_dataset(dataset_id);
    res.json(rows);
  } catch (error) {
    console.error("get_votes_by_dataset error:", error);
    res.status(500).json({ error: "Error" });
  }
});

/**
 * Function which retrieves all databases voted by a specific user using the user's id as parameter
 */
app.get('/api/get_votes_by_user', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Falta 'user_id'" });
    }
    const rows = await get_votes_by_user(user_id);
    res.json(rows);
  } catch (error) {
    console.error("get_votes_by_user error:", error);
    res.status(500).json({ error: "Error" });
  }
});


/*Downloads---------------------------------------------------------------*/
app.post('/api/record_new_download', async (req, res)=>{
  try{
    const {dataset_id, user_id, dataset_description, dataset_name, user_name} = req.body;
    if(!dataset_id || !user_id || !dataset_description || !dataset_name || !user_name)
    {
      return res.status(400).json({error: "Falta 'dataset_id' o 'user_id', 'dataset_description' o 'dataset_name' o 'user_name'"});
    }

    const rows = await record_new_download (dataset_id, user_id, dataset_description, dataset_name, user_name);
    res.json(rows);

  }catch(error){
    console.error("/api/record_new_download:", error);
    res.status(500).json({ error: "Error" });
  }
});


app.get('/api/get_downloads_by_dataset', async (req, res) => {
  try {
    const {dataset_id } = req.query;
    if (!dataset_id) {
      return res.status(400).json({ error: "Falta 'dataset_id'" });
    }
    const rows = await get_downloads_by_dataset(dataset_id);
    res.json(rows);
  } catch (error) {
    console.error("get_downloads_by_dataset:", error);
    res.status(500).json({ error: "Error" });
  }
});


/**Conversation ---------------------------------------------------------------------- */
app.post('/api/start_conversation', async (req, res) => {
  try {
    const { id_user_one, id_user_two, user_one_name, user_two_name } = req.body;
    
    if (!id_user_one || !id_user_two || !user_one_name || !user_two_name) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: 'id_user_one', 'id_user_two', 'user_one_name', 'user_two_name'" 
      });
    }
    
    const existing = await conversation_exists(id_user_one, id_user_two);
    if (existing.exists) {
      return res.status(200).json({ 
        message: "La conversación ya existe",
        id_conversation: existing.id_conversation
      });
    }
    
    const result = await start_conversation({id_user_one, id_user_two,user_one_name, user_two_name
    });
    
    res.json(result);
    
  } catch (error) {
    console.error("start_conversation error:", error);
    res.status(500).json({ error: "Error al iniciar conversación" });
  }
});

app.get('/api/get_user_conversations', async (req, res) => {
  try {
    const { id_user } = req.query;
    
    if (!id_user) {
      return res.status(400).json({ error: "Falta 'id_user'" });
    }
    
    const conversations = await get_user_conversations(id_user);
    res.json(conversations);
    
  } catch (error) {
    console.error("get_user_conversations error:", error);
    res.status(500).json({ error: "Error" });
  }
});

app.post('/api/send_message', async (req, res) => {
  try {
    const { id_conversation, id_user, message } = req.body;
    
    if (!id_conversation || !id_user || !message) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: 'id_conversation', 'id_user', 'message'" 
      });
    }
    
    const result = await send_message({ id_conversation, id_user, message });
    res.json(result);
    
  } catch (error) {
    console.error("send_message error:", error);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});

app.get('/api/get_conversation_messages', async (req, res) => {
  try {
    const { id_conversation } = req.query;
    
    if (!id_conversation) {
      return res.status(400).json({ error: "Falta 'id_conversation'" });
    }
    
    const messages = await get_conversation_messages(id_conversation);
    res.json(messages);
    
  } catch (error) {
    console.error("get_conversation_messages error:", error);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});



/*Cassandra methods end here*/
async function startServer() {
  try {
    await init_cassandra();
    app.listen(port, () => {
      console.log(`App running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
