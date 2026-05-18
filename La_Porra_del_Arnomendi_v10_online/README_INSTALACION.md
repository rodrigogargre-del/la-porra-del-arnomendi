# La Porra del Arnomendi v10 online

Esta versión está preparada para funcionar como web online usando:

- **Supabase** como base de datos común.
- **Vercel** o **Netlify** para publicar la página.

## 1. Crear la base de datos en Supabase

1. Entra en tu proyecto de Supabase.
2. En la barra izquierda pulsa **SQL Editor**.
3. Pulsa **New query**.
4. Abre el archivo `database/schema.sql` de esta carpeta.
5. Copia todo su contenido.
6. Pégalo en Supabase.
7. Pulsa **Run**.

Con eso se crea una tabla llamada `app_state`, donde se guardarán:

- usuarios registrados;
- apuestas creadas;
- pronósticos de cada usuario;
- ranking y puntos.

## 2. Configuración ya incluida

La web ya lleva configurado tu proyecto Supabase en `js/app.js`:

```js
URL: "https://rahtacqygsmtdepezzme.supabase.co"
```

La clave incluida es una **publishable key**, es decir, una clave pública pensada para navegador.

No metas nunca una clave `service_role` en la web.

## 3. Publicar en Vercel

1. Crea una cuenta en GitHub si todavía no la tienes.
2. Crea un repositorio nuevo, por ejemplo: `la-porra-del-arnomendi`.
3. Sube todos los archivos de esta carpeta al repositorio.
4. Entra en Vercel.
5. Pulsa **New Project**.
6. Importa el repositorio desde GitHub.
7. Pulsa **Deploy**.

Vercel te dará un enlace público para entrar en la web.

## 4. Contraseñas actuales

Contraseña general:

```txt
Arnomendi1234
```

Administrador:

```txt
Usuario: admin
Contraseña: Contraseñasegura1234
```

## 5. Aviso importante

Esta versión usa una base de datos común y funciona online, pero es una implementación sencilla para una porra privada. La contraseña general y la contraseña de admin están en el código de la web, por lo que no debe usarse para información sensible.

Para una versión con seguridad real habría que usar Supabase Auth y guardar usuarios/roles de forma autenticada.
