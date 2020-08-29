declare module "*.gql" {
  const content: string;
  export default content;
}
declare module "*.yml" {
  const content: { [x: string]: any };
  export default content;
}
