import HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import * as webpack from "webpack";

const config: webpack.Configuration = {
  mode: "development",
  entry: "./src/renderer/script/renderer.ts",
  target: "web",
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "build/renderer"),
    clean: true,
  },
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig-renderer.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    // Use src/index.html as the entry point.
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
    }),
  ],
};

// eslint-disable-next-line import/no-default-export
export default config;
