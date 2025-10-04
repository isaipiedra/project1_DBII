import { Client, types } from 'cassandra-driver';

const client = new Client({
  contactPoints: ['127.0.0.1:9042'],   
  localDataCenter: 'dc1',            
  keyspace: 'dataset_message_management',
});

export async function init_cassandra() {
  await client.connect();
  console.log('Conectado a Cassandra exitosamente');
}

export async function shutdown() {
  await client.shutdown();
}

/**Comments-------------------------------------------------------------------------------------*/
export async function add_comment({ id_dataset, user_name, comment, visible = true }) {
  const id_comment = types.TimeUuid.now();
  const q = `INSERT INTO comment_ds (id_dataset, id_comment, user_name, comment, visible)
             VALUES (?, ?, ?, ?, ?)`;
  const params = [id_dataset, id_comment, user_name, comment, visible];
  await client.execute(q, params, { prepare: true });
  return { id_dataset, id_comment: id_comment.toString(), user_name, comment, visible };
}

/** Function which returns either the visible or "invsible" ;-; dataset comments. This using 
 * the dataset ID as parameter and a "Visible" boolean option. If is is undefined all the comments
 * that belongs to a certain dataset are returned*/ 
export async function get_all_comments_by_dataset(id_dataset, { visible = undefined } = {}) {
  let query = `
    SELECT id_dataset, id_comment, comment, user_name, visible
    FROM comment_ds
    WHERE id_dataset = ?
  `;
  
  const params = [id_dataset];
  
  if (visible !== undefined) {
    query += ` AND visible = ${visible}`;
  }
  
  query += ` ORDER BY id_comment DESC`;
  
  if (visible !== undefined) {
    query += ` ALLOW FILTERING`;
  }
  
  const all = [];
  let pageState = null;

  do {
    const rs = await client.execute(query, params, {
      prepare: true,
      fetchSize: 500,        
      pageState: pageState || undefined,
    });

    for (const r of rs.rows) {
      all.push({
        id_dataset: r.id_dataset,
        id_comment: r.id_comment.toString(),
        comment: r.comment,
        user_name: r.user_name,
        visible: r.visible,
      });
    }

    pageState = rs.pageState || null;
  } while (pageState);

  return all;
}

/**Function which returns all the comments in the system without filters */
export async function get_all_comments() {
  let query = ` 
    SELECT id_dataset, id_comment, comment, user_name, visible 
    FROM comment_ds`;
  
    const all = [];
  let pageState = null;

  do {
    const rs = await client.execute(query, {
      prepare: true,
      fetchSize: 500,        
      pageState: pageState || undefined,
    });

    for (const r of rs.rows) {
      all.push({
        id_dataset: r.id_dataset,
        id_comment: r.id_comment.toString(),
        comment: r.comment,
        user_name: r.user_name,
        visible: r.visible,
      });
    }

    pageState = rs.pageState || null;
  } while (pageState);

  return all;
  
}


/**Functions which receives id_dataset and id_comment as strings but visibility as bool xd.
 * It updates the state of a comment.
 */
export async function update_comment_visibility(id_dataset, id_comment, visible) {
  let query = `
              UPDATE comment_ds
              set visible = ?
              WHERE id_dataset = ? AND id_comment = ?
              `;

  const id_comment_timeuuid = types.TimeUuid.fromString(id_comment);
  const params = [visible, id_dataset, id_comment_timeuuid];
  await client.execute(query, params, {prepare: true});
  
  return {id_dataset, id_comment: id_comment_timeuuid.toString(), visible, updated: true};
  
}



/**Reply Section----------------------------------------------------------------------- */
/**
 * Function which allows to the user to reply a specific comment
 * Entries: comment's id, username, the reply message
 */
export async function reply_comment({id_comment, username, reply, visible=true})
{
  const id_comment_timeuuid = types.TimeUuid.fromString(id_comment);
  const id_reply = types.TimeUuid.now();
  const query = `INSERT INTO comment_reply (id_comment, reply_id, reply, username, visible)
             VALUES (?, ?, ?, ?, ?)`;
  const params = [id_comment_timeuuid, id_reply, reply, username, visible];
  await client.execute(query, params, { prepare: true });
  return { id_comment, id_reply: id_reply.toString(), reply, username, visible };

}

/**
 * Function which returns all the comments replies
 * If it has not replies. It returns []
 * Entries: The comment's id and the visibility state of the comments. It returns all the replies related to the
 * id_comment if this point is not specified.
 */
export async function get_comment_replies(id_comment, { visible = undefined } = {})
{
  const id_comment_timeuuid = types.TimeUuid.fromString(id_comment);
  let query = `
                SELECT id_comment, reply_id, reply, username, visible
                FROM comment_reply
                WHERE id_comment = ?`;
                
  const params = [id_comment_timeuuid];
  
  if (visible !== undefined) {
    query += ` AND visible = ?`; 
    params.push(visible);          
  }
  
  query += ` ORDER BY reply_id ASC`;
  
  if (visible !== undefined) {
    query += ` ALLOW FILTERING`;
  }
  
  const all = [];
  let pageState = null;

  do {
    const rs = await client.execute(query, params, {
      prepare: true,
      fetchSize: 500,        
      pageState: pageState || undefined,
    });

    for (const r of rs.rows) {
      all.push({
        id_comment: r.id_comment.toString(),
        reply_id: r.reply_id.toString(),
        reply: r.reply,
        username: r.username,
        visible: r.visible,
      });
    }

    pageState = rs.pageState || null;
  } while (pageState);

  return all;
}

/**
 * Function which changes the visibility of one specific reply
 * It's entries are the id of the main comment (the one being replied), the reply id and the new state
 */
export async function update_reply_visibility(id_comment, reply_id, visible)
{
    let query = `
              UPDATE comment_reply
              set visible = ?
              WHERE id_comment = ? AND reply_id = ?
              `;

  const id_comment_timeuuid = types.TimeUuid.fromString(id_comment);
  const id_reply_timeuuid = types.TimeUuid.fromString(reply_id);
  const params = [visible, id_comment_timeuuid, id_reply_timeuuid];
  await client.execute(query, params, {prepare: true});
  
  return {id_comment: id_comment_timeuuid.toString(), reply_id : id_reply_timeuuid.toString(),visible, updated: true};

}


/*Calification*/
export async function add_dataset_vote({ dataset_id, user_id, dataset_name, dataset_description, user_name, 
  calification 
}) {

  const query1 = `
    INSERT INTO dataset_vote (dataset_id, user_id, dataset_name, dataset_description, user_name, calification)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const query2 = `
    INSERT INTO vote_by_user_ds (user_id, dataset_id, dataset_name, dataset_description, calification)
    VALUES (?, ?, ?, ?, ?)
  `;

  const queries = [
    {
      query: query1,
      params: [dataset_id, user_id, dataset_name, dataset_description, user_name, calification]
    },
    {
      query: query2,
      params: [user_id, dataset_id, dataset_name, dataset_description, calification]
    }
  ];

  await client.batch(queries, { prepare: true });

  return {dataset_id,user_id, dataset_name, dataset_description, user_name, calification,created: true};
}

/**
 * Function which retrieves all the database voters using the database's id as parameter
 */
export async function get_votes_by_dataset(dataset_id) {
  const query = `
    SELECT dataset_id, user_id, dataset_name, dataset_description, user_name, calification
    FROM dataset_vote
    WHERE dataset_id = ?
  `;
  
  const result = await client.execute(query, [dataset_id], { prepare: true });
  return result.rows;
}

/**
 * Function which retrieves all databases voted by a specific user using the user's id as parameter
 */
export async function get_votes_by_user(user_id) {
  const query = `
    SELECT user_id, dataset_id, dataset_name, dataset_description, calification
    FROM vote_by_user_ds
    WHERE user_id = ?
  `;
  
  const result = await client.execute(query, [user_id], { prepare: true });
  return result.rows;
}


/*Downloads-----------------------------------------------------------------------*/
export async function record_new_download( dataset_id, user_id, dataset_description, dataset_name, user_name)
{

  const query_insert = `INSERT INTO DOWNLOADED_DATASET (dataset_id, user_id, dataset_description, dataset_name, user_name)
    VALUES (?, ?, ?, ?, ?) IF NOT EXISTS`;

  const insert = await client.execute(query_insert, [dataset_id, user_id, dataset_description, dataset_name, user_name], {prepare:true});
  return {dataset_id, user_id, dataset_description, dataset_name, user_name,inserted: insert.wasApplied() }

}

export async function get_downloads_by_dataset(dataset_id) {
  const query = `
    SELECT dataset_id, user_id, dataset_description, dataset_name, user_name
    FROM downloaded_dataset
    WHERE dataset_id = ?
  `;
  const result = await client.execute(query, [dataset_id], { prepare: true });
  return result.rows;
}

/*Messages-------------------------------------------------------------------------------- */
/**Function which starts a conversation*/
export async function start_conversation({ id_user_one, id_user_two, user_one_name, user_two_name }) {
  const id_conversation = types.TimeUuid.now();
  
  const queries = [
    {
      query: `
        INSERT INTO user_conversation (id_user_one, id_user_two, id_conversation, user_one_name, user_two_name)
        VALUES (?, ?, ?, ?, ?)
      `,
      params: [id_user_one, id_user_two, id_conversation, user_one_name, user_two_name]
    },
    {
      query: `
        INSERT INTO conversation_by_user (id_user_one, id_conversation, id_user_two, user_two_name)
        VALUES (?, ?, ?, ?)
      `,
      params: [id_user_one, id_conversation, id_user_two, user_two_name]
    },
    {
      query: `
        INSERT INTO conversation_by_user (id_user_one, id_conversation, id_user_two, user_two_name)
        VALUES (?, ?, ?, ?)
      `,
      params: [id_user_two, id_conversation, id_user_one, user_one_name]
    }
  ];
  
  await client.batch(queries, { prepare: true });
  
  return {id_conversation: id_conversation.toString(), id_user_one,id_user_two,user_one_name,user_two_name,created_at: id_conversation.getDate().toISOString()
  };
}

/**Function which returns all the conversation of an user using it's id as reference */
export async function get_user_conversations(id_user) {
  const query = `
    SELECT id_user_one, id_conversation, id_user_two, user_two_name
    FROM conversation_by_user
    WHERE id_user_one = ?
    ORDER BY id_conversation DESC
  `;
  
  const result = await client.execute(query, [id_user], { prepare: true });
  
  return result.rows.map(row => ({
    id_conversation: row.id_conversation.toString(),
    id_user_one: row.id_user_one,
    id_user_two: row.id_user_two,
    user_two_name: row.user_two_name,
    created_at: row.id_conversation.getDate().toISOString()
  }));
}
/**Function which seeks if a conversation between two users already exists, returning the id
 * of the conversation. It uses both user_one and user_two id's.
 */
export async function conversation_exists(id_user_one, id_user_two) {
  const query = `
    SELECT id_conversation
    FROM user_conversation
    WHERE id_user_one = ? AND id_user_two = ?
  `;
  
  const result = await client.execute(query, [id_user_one, id_user_two], { prepare: true });
  
  if (result.rows.length > 0) {
    return {
      exists: true,
      id_conversation: result.rows[0].id_conversation.toString()
    };
  }
  
  return { exists: false };
}

export async function send_message({ id_conversation, id_user, message }) {
  const id_conversation_uuid = types.TimeUuid.fromString(id_conversation);
  const id_message = types.TimeUuid.now();
  
  const query = `
    INSERT INTO conversation_message (id_conversation, id_message, id_user, message)
    VALUES (?, ?, ?, ?)
  `;
  
  await client.execute(query, [id_conversation_uuid, id_message, id_user, message], { prepare: true });
  
  return {id_conversation,id_message: id_message.toString(),id_user,message, sent_at: id_message.getDate().toISOString()
  };
}

export async function get_conversation_messages(id_conversation) {
  const id_conversation_uuid = types.TimeUuid.fromString(id_conversation);
  
  const query = `
    SELECT id_conversation, id_message, id_user, message
    FROM conversation_message
    WHERE id_conversation = ?
  `;
  
  const result = await client.execute(query, [id_conversation_uuid], { prepare: true });
  
  return result.rows.map(row => ({id_conversation: row.id_conversation.toString(),id_message: row.id_message.toString(),
    id_user: row.id_user,message: row.message, sent_at: row.id_message.getDate().toISOString()
  }));
}

export async function get_latest_message(id_conversation) {
  const id_conversation_uuid = types.TimeUuid.fromString(id_conversation);
  
  const query = `
    SELECT id_conversation, id_message, id_user, message
    FROM conversation_message
    WHERE id_conversation = ?
    LIMIT 1
  `;
  
  const result = await client.execute(query, [id_conversation_uuid], { prepare: true });
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {id_conversation: row.id_conversation.toString(), id_message: row.id_message.toString(), id_user: row.id_user, message: row.message, sent_at: row.id_message.getDate().toISOString()
  };
}