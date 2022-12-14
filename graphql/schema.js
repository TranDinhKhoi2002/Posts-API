const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    type PostsData {
        posts: [Post!]!
        totalPosts: Int!
    }

    input UserInputData {
        email: String!
        password: String!
        name: String!
    }

    input PostInputData {
        title: String!
        imageUrl: String!
        content: String!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(id: ID!, postInput: PostInputData): Post!
        deletePost(id: ID!): Boolean
        updateStatus(status: String!): User!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts(page: Int): PostsData
        singlePost(postId: ID!): Post!
        user: User!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
