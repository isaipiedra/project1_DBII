CREATE KEYSPACE IF NOT EXISTS  DATASET_MESSAGE_MANAGEMENT WITH REPLICATION = {'class':'SimpleStrategy','replication_factor': 2} AND durable_writes = true;

USE DATASET_MESSAGE_MANAGEMENT;

--Vote's table. Has the user data and dataset data  
CREATE TABLE IF NOT EXISTS DATASET_VOTE (dataset_id text, user_id text, dataset_name text, dataset_description text, user_name text, calification int, PRIMARY KEY(dataset_id, user_id)); 

--New one
CREATE TABLE IF NOT EXISTS VOTE_BY_USER_DS (user_id text, dataset_id text, dataset_name text, dataset_description text, calification int, PRIMARY KEY (user_id, dataset_id));

--Dataset downloads 
CREATE TABLE IF NOT EXISTS DOWNLOADED_DATASET (dataset_id text, user_id text, dataset_name text, dataset_description text, user_name text, PRIMARY KEY(dataset_id, user_id));

--Dataset main comments table
CREATE TABLE  IF NOT EXISTS COMMENT_DS(id_dataset text, id_comment timeuuid, user_name text, comment text, visible boolean, PRIMARY KEY (id_dataset, id_comment)) with CLUSTERING ORDER BY (id_comment DESC);

--Dataset comment reply table
CREATE TABLE IF NOT EXISTS COMMENT_REPLY (id_comment timeuuid,reply_id timeuuid, username text, REPLY text,visible boolean,  PRIMARY KEY(id_comment, reply_id)) WITH CLUSTERING ORDER BY (reply_id ASC);


--Messages tables
--This table just saves the id of the conversation
CREATE TABLE IF NOT EXISTS USER_CONVERSATION(id_user_one text, id_user_two text, id_conversation timeuuid, user_one_name text, user_two_name text, PRIMARY KEY((id_user_one, id_user_two), id_conversation));

CREATE TABLE IF NOT EXISTS CONVERSATION_BY_USER(id_user_one text, id_conversation timeuuid, id_user_two text, user_two_name text, PRIMARY KEY(id_user_one, id_conversation));

--This tables has all the conversations
CREATE TABLE IF NOT EXISTS CONVERSATION_MESSAGE(id_conversation timeuuid, id_message timeuuid, id_user text, message text, PRIMARY KEY(id_conversation, id_message)) WITH CLUSTERING ORDER BY (id_message DESC);