USE [QuickTrade]
GO

/****** Object:  Table [dbo].[users] ******/
IF OBJECT_ID('[dbo].[users]', 'U') IS NOT NULL
DROP TABLE [dbo].[users];
GO

CREATE TABLE [dbo].[users](
	[user_id] [int] IDENTITY(1,1) NOT NULL,
    [full_name] [varchar](100) NULL,
	[username] [varchar](50) NOT NULL UNIQUE,
	[email] [varchar](100) NOT NULL UNIQUE,
	[password] [varchar](255) NOT NULL,
    [premium_status] [bit] DEFAULT 0,
    [balance] [decimal](18, 2) DEFAULT 0.00,
    [created_at] [datetime] DEFAULT GETDATE(),
    [updated_at] [datetime] DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([user_id] ASC)
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[Items] ******/
IF OBJECT_ID('[dbo].[Items]', 'U') IS NOT NULL
DROP TABLE [dbo].[Items];
GO
CREATE TABLE [dbo].[Items](
	[item_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NOT NULL,
	[game] [varchar](50) NOT NULL,
	[name] [varchar](100) NOT NULL,
	[description] [text] NULL,
	[value] [decimal](18, 2) NOT NULL,
	[tradable_status] [bit] DEFAULT 1,
	[image] [varchar](255) NULL,
PRIMARY KEY CLUSTERED ([item_id] ASC),
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id])
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[ItemPosts] ******/
IF OBJECT_ID('[dbo].[ItemPosts]', 'U') IS NOT NULL
DROP TABLE [dbo].[ItemPosts];
GO
CREATE TABLE [dbo].[ItemPosts](
	[post_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NOT NULL,
	[screenshot_url] [varchar](255) NULL,
	[name] [varchar](100) NOT NULL,
	[game] [varchar](50) NOT NULL,
	[description] [text] NULL,
	[value] [decimal](18, 2) NOT NULL,
	[tags] [varchar](255) NULL,
PRIMARY KEY CLUSTERED ([post_id] ASC),
FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id])
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[Trades] ******/
IF OBJECT_ID('[dbo].[Trades]', 'U') IS NOT NULL
DROP TABLE [dbo].[Trades];
GO
CREATE TABLE [dbo].[Trades](
	[trade_id] [int] IDENTITY(1,1) NOT NULL,
	[item_offered] [int] NOT NULL,
	[item_requested] [int] NOT NULL,
	[status] [varchar](20) DEFAULT 'pending',
	[escrow_fee] [decimal](18, 2) DEFAULT 0.00,
	[timestamp] [datetime] DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([trade_id] ASC),
FOREIGN KEY ([item_offered]) REFERENCES [dbo].[Items]([item_id]),
FOREIGN KEY ([item_requested]) REFERENCES [dbo].[Items]([item_id])
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[Conversations] ******/
IF OBJECT_ID('[dbo].[Conversations]', 'U') IS NOT NULL
DROP TABLE [dbo].[Conversations];
GO
CREATE TABLE [dbo].[Conversations](
	[convo_id] [int] IDENTITY(1,1) NOT NULL,
	[user1_id] [int] NOT NULL,
	[user2_id] [int] NOT NULL,
	[last_message] [text] NULL,
	[last_timestamp] [datetime] DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([convo_id] ASC),
FOREIGN KEY ([user1_id]) REFERENCES [dbo].[users]([user_id]),
FOREIGN KEY ([user2_id]) REFERENCES [dbo].[users]([user_id])
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[Messages] ******/
IF OBJECT_ID('[dbo].[Messages]', 'U') IS NOT NULL
DROP TABLE [dbo].[Messages];
GO
CREATE TABLE [dbo].[Messages](
	[msg_id] [int] IDENTITY(1,1) NOT NULL,
	[sender_id] [int] NOT NULL,
	[receiver_id] [int] NOT NULL,
	[convo_id] [int] NOT NULL,
	[content] [text] NOT NULL,
	[timestamp] [datetime] DEFAULT GETDATE(),
	[item_id] [int] NULL,
PRIMARY KEY CLUSTERED ([msg_id] ASC),
FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users]([user_id]),
FOREIGN KEY ([receiver_id]) REFERENCES [dbo].[users]([user_id]),
FOREIGN KEY ([convo_id]) REFERENCES [dbo].[Conversations]([convo_id]),
FOREIGN KEY ([item_id]) REFERENCES [dbo].[Items]([item_id])
) ON [PRIMARY]
GO
