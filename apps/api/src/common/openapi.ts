import type { OpenAPIObject } from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

const string: SchemaObject = { type: "string" };
const integer: SchemaObject = { type: "integer", minimum: 0 };
const timestamp: SchemaObject = { type: "string", format: "date-time" };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (name: string): SchemaObject => ({
  type: "array",
  items: ref(name),
});
const object = (properties: SchemaObject["properties"]): SchemaObject => ({
  type: "object",
  properties,
  required: Object.keys(properties || {}),
});

export function describeResponses(document: OpenAPIObject): OpenAPIObject {
  const totals = {
    planned: integer,
    issued: integer,
    orders: integer,
    ready: integer,
    cooking: integer,
    fresh: integer,
    cookingPortions: integer,
    newPortions: integer,
  };
  const order = {
    id: integer,
    dishId: string,
    dish: string,
    groupId: string,
    group: string,
    quantity: integer,
    serviceDate: { type: "string" as const, format: "date" },
    servingTime: { type: "string" as const, example: "12:10" },
    status: { type: "string" as const, enum: ["new", "cooking", "ready"] },
    createdAt: timestamp,
    cookingAt: { ...timestamp, nullable: true },
    readyAt: { ...timestamp, nullable: true },
    createdBy: string,
  };
  const analytics = {
    scope: ref("Scope"),
    totals: ref("Totals"),
    dishes: array("Breakdown"),
    groups: array("Breakdown"),
    chart: array("ChartPoint"),
    recent: array("Order"),
    updatedAt: timestamp,
  };
  const schemas: Record<string, SchemaObject> = {
    Identity: object({
      role: { type: "string", enum: ["admin", "cook"] },
      login: string,
    }),
    ApplicationContext: object({
      user: ref("Identity"),
      today: { type: "string", format: "date" },
      timezone: string,
      csrfToken: string,
    }),
    CatalogEntry: object({ id: string, name: string }),
    Catalog: object({
      dishes: array("CatalogEntry"),
      groups: array("CatalogEntry"),
    }),
    Scope: object({
      date: string,
      from: string,
      to: string,
      period: { type: "string", enum: ["day", "week"] },
      timezone: string,
    }),
    Totals: object(totals),
    Order: object(order),
    OrderEvent: object({
      id: integer,
      status: order.status,
      happenedAt: timestamp,
      actor: string,
    }),
    OrderDetail: object({ order: ref("Order"), events: array("OrderEvent") }),
    OrderPage: object({
      items: array("Order"),
      total: integer,
      page: integer,
      pageSize: integer,
      totals: ref("Totals"),
      counts: object({
        all: integer,
        new: integer,
        cooking: integer,
        ready: integer,
      }),
      scope: ref("Scope"),
    }),
    Breakdown: object({ id: string, name: string, ...totals }),
    ChartPoint: object({ key: string, label: string, issued: integer }),
    Analytics: object(analytics),
    EntityAnalytics: object({
      ...analytics,
      entity: ref("CatalogEntry"),
      kind: { type: "string", enum: ["dish", "group"] },
      orders: ref("OrderPage"),
    }),
    ApiError: object({ statusCode: integer, message: string }),
    Health: object({ status: { type: "string", enum: ["ok"] } }),
  };
  document.components ??= {};
  document.components.schemas = { ...document.components.schemas, ...schemas };
  const responses: [string, "get" | "post" | "patch", number, string | null][] =
    [
      ["/health", "get", 200, "Health"],
      ["/auth/login", "post", 200, "ApplicationContext"],
      ["/auth/me", "get", 200, "ApplicationContext"],
      ["/auth/logout", "post", 204, null],
      ["/catalog", "get", 200, "Catalog"],
      ["/orders", "get", 200, "OrderPage"],
      ["/orders", "post", 201, "OrderDetail"],
      ["/orders/{id}", "get", 200, "OrderDetail"],
      ["/orders/{id}/status", "patch", 200, "OrderDetail"],
      ["/analytics", "get", 200, "Analytics"],
      ["/analytics/dishes/{id}", "get", 200, "EntityAnalytics"],
      ["/analytics/groups/{id}", "get", 200, "EntityAnalytics"],
    ];
  for (const [path, method, status, schema] of responses) {
    const operation = document.paths[`/api/v1${path}`]?.[method];
    if (!operation) continue;
    operation.responses[status] = {
      description: "Успешный ответ",
      ...(schema
        ? { content: { "application/json": { schema: ref(schema) } } }
        : {}),
    };
    for (const code of [400, 401, 403, 404, 409, 429, 500])
      operation.responses[code] = {
        description: "Ошибка запроса",
        content: { "application/json": { schema: ref("ApiError") } },
      };
    if (method !== "get")
      operation.parameters = [
        ...(operation.parameters || []),
        {
          name: "X-CSRF-Token",
          in: "header",
          required: path !== "/auth/login",
          schema: string,
        },
      ];
  }
  return document;
}
