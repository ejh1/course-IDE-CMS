const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const S3Plugin = require('webpack-s3-plugin');
const AWS = require('aws-sdk/global');

module.exports = (env, argv) => {
    const {mode} = argv;
    const isProduction = mode === 'production';
    return {
        mode,

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",

        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: [".js", ".ts", ".tsx"]
        },
        entry: './src/index.tsx',
        output: {
            path: path.join(__dirname, '/dist'),
            filename: 'bundle.js',
            chunkFilename: '[name].[chunkhash].js',
        },
        optimization : {
            splitChunks : {
                chunks: 'all'
            }
        },
        resolve: {
            plugins: [new TsconfigPathsPlugin({})],
            extensions: ['.js','.ts','.tsx','.html']
        },
        devServer : {
            hot: true,
            port: 9000
        },

        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "ts-loader"
                        }
                    ]
                },
                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                {
                    enforce: "pre",
                    test: /\.js$/,
                    loader: "source-map-loader"
                },
                {
                    test: /\.(s[ac]ss|css)$/i,
                    use: [
                    // Creates `style` nodes from JS strings
                    'style-loader',
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                    ],
                },
                {
                    test: /assets\/.*\.html$/,
                    use: [
                        'file-loader'
                    ]
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/index.html'
            }),
            new MonacoWebpackPlugin({languages:['javascript','typescript','html','css']}),
        ].concat(isProduction ? [
            new CompressionPlugin({
                test: /\.(js|css|map)$/,
                filename: '[path][query]',
                algorithm: 'gzip',
                // deleteOriginalAssets: true
            }),
            new S3Plugin({
                s3Options: {
                    credentials: new AWS.SharedIniFileCredentials({profile: 'private'})
                },
                s3UploadOptions: {
                Bucket: 'demo-mtova-course-cms', // Your bucket name
                // Here we set the Content-Encoding header for all the gzipped files to 'gzip'
                ContentEncoding(fileName) {
                    if (/\.(js|css|map)$/.test(fileName)) {
                    return 'gzip'
                    }
                },
                // Here we set the Content-Type header for the gzipped files to their appropriate values, so the browser can interpret them properly
                ContentType(fileName) {
                    if (/\.css/.test(fileName)) {
                    return 'text/css'
                    }
                    if (/\.js/.test(fileName)) {
                    return 'application/javascript'
                    }
                }
                },
                // basePath: 'my-dist', // This is the name the uploaded directory will be given
                // directory: 'public/dist' // This is the directory you want to upload
            })
        ] : [])
    };
}