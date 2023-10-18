export enum Model {
    GGML_CLIP = 'ggml_clip',
}

export interface EncryptedEmbedding {
    fileID: number;
    model: Model;
    encryptedEmbedding: string;
    decryptionHeader: string;
    updatedAt: number;
}

export interface Embedding
    extends Omit<
        EncryptedEmbedding,
        'encryptedEmbedding' | 'decryptionHeader'
    > {
    embedding: Float32Array;
}

export interface GetEmbeddingDiffResponse {
    diff: EncryptedEmbedding[];
}
